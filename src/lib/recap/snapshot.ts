// Per-household weekly recap snapshot — the data the email is built from.
// Pure data layer; render.ts turns it into HTML.

import { createServiceSupabase } from "@/lib/supabase/server";
import { PILLAR_COPY } from "@/lib/pillars/copy";
import type { PillarSlug } from "@/lib/types/pillar";

export type WeeklyRecap = {
  householdId: string;
  householdName: string;
  parents: Array<{ id: string; name: string; email: string }>;
  thisWeek: {
    completions: number;
    xp: number;
    badges: number;
    byPillar: Array<{ pillar: PillarSlug; count: number }>;
    byChild: Array<{ childId: string; name: string; xp: number; completions: number }>;
  };
  priorWeek: {
    completions: number;
    xp: number;
  };
  topPillar: { pillar: PillarSlug; count: number } | null;
  topChild: { name: string; xp: number } | null;
  newBadges: Array<{ childName: string; badgeId: string; earnedAt: string }>;
  // Token to fetch the share card image; null means parent never paired a display.
  shareToken: string | null;
};

function isoStart(date: Date): string {
  return date.toISOString();
}

export async function buildHouseholdRecap(
  householdId: string,
  asOf: Date = new Date(),
): Promise<WeeklyRecap | null> {
  const svc = createServiceSupabase();
  const week1Start = new Date(asOf.getTime() - 7 * 24 * 60 * 60 * 1000);
  const week2Start = new Date(asOf.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [
    { data: household },
    { data: parents },
    { data: kids },
    { data: shareTokenRow },
  ] = await Promise.all([
    svc
      .from("households")
      .select("id, name")
      .eq("id", householdId)
      .maybeSingle(),
    svc
      .from("parents")
      .select("id, name, email")
      .eq("household_id", householdId),
    svc
      .from("children")
      .select("id, name")
      .eq("household_id", householdId),
    svc
      .from("household_display_tokens")
      .select("token")
      .eq("household_id", householdId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!household) return null;
  const childList = (kids ?? []).map((c) => ({
    id: c.id as string,
    name: (c.name as string) ?? "",
  }));
  const childIds = childList.map((c) => c.id);
  const childNameById = new Map(childList.map((c) => [c.id, c.name]));

  // Pull two weeks of approvals in one query, then bucket in memory.
  const completions: Array<{
    child_id: string;
    approved_at: string;
    quests: { pillar: PillarSlug; xp_reward: number } | null;
  }> = [];
  if (childIds.length > 0) {
    const { data } = await svc
      .from("quest_completions")
      .select(
        "child_id, approved_at, quests:quests(pillar, xp_reward)",
      )
      .in("child_id", childIds)
      .gte("approved_at", isoStart(week2Start))
      .not("approved_at", "is", null);
    for (const r of data ?? []) {
      const quest = (r.quests as unknown) as
        | { pillar: PillarSlug; xp_reward: number }
        | null;
      completions.push({
        child_id: r.child_id as string,
        approved_at: r.approved_at as string,
        quests: quest,
      });
    }
  }

  const thisWeek = {
    completions: 0,
    xp: 0,
    badges: 0,
    byPillar: [] as Array<{ pillar: PillarSlug; count: number }>,
    byChild: [] as Array<{
      childId: string;
      name: string;
      xp: number;
      completions: number;
    }>,
  };
  const priorWeek = { completions: 0, xp: 0 };
  const pillarCounts = new Map<PillarSlug, number>();
  const childAgg = new Map<string, { xp: number; completions: number }>();

  for (const c of completions) {
    const approvedAt = new Date(c.approved_at).getTime();
    const isThisWeek = approvedAt >= week1Start.getTime();
    const xp = c.quests?.xp_reward ?? 0;
    if (isThisWeek) {
      thisWeek.completions += 1;
      thisWeek.xp += xp;
      if (c.quests?.pillar) {
        pillarCounts.set(
          c.quests.pillar,
          (pillarCounts.get(c.quests.pillar) ?? 0) + 1,
        );
      }
      const agg = childAgg.get(c.child_id) ?? { xp: 0, completions: 0 };
      agg.xp += xp;
      agg.completions += 1;
      childAgg.set(c.child_id, agg);
    } else {
      priorWeek.completions += 1;
      priorWeek.xp += xp;
    }
  }

  thisWeek.byPillar = Array.from(pillarCounts.entries())
    .map(([pillar, count]) => ({ pillar, count }))
    .sort((a, b) => b.count - a.count);
  thisWeek.byChild = Array.from(childAgg.entries())
    .map(([childId, v]) => ({
      childId,
      name: childNameById.get(childId) ?? "",
      xp: v.xp,
      completions: v.completions,
    }))
    .sort((a, b) => b.xp - a.xp);

  const topPillar = thisWeek.byPillar[0] ?? null;
  const topChild = thisWeek.byChild[0]
    ? { name: thisWeek.byChild[0].name, xp: thisWeek.byChild[0].xp }
    : null;

  // Badges earned this week.
  const newBadges: WeeklyRecap["newBadges"] = [];
  if (childIds.length > 0) {
    const { data } = await svc
      .from("child_achievements")
      .select("child_id, badge_id, earned_at")
      .in("child_id", childIds)
      .gte("earned_at", isoStart(week1Start));
    for (const b of data ?? []) {
      newBadges.push({
        childName: childNameById.get(b.child_id as string) ?? "",
        badgeId: b.badge_id as string,
        earnedAt: b.earned_at as string,
      });
    }
  }
  thisWeek.badges = newBadges.length;

  return {
    householdId,
    householdName: (household.name as string) || "Your family",
    parents: (parents ?? [])
      .map((p) => ({
        id: p.id as string,
        name: (p.name as string) ?? "",
        email: (p.email as string) ?? "",
      }))
      .filter((p) => p.email.length > 0),
    thisWeek,
    priorWeek,
    topPillar,
    topChild,
    newBadges,
    shareToken: (shareTokenRow?.token as string | undefined) ?? null,
  };
}

/** Resolve a friendly pillar title from a slug. */
export function pillarTitle(p: PillarSlug): string {
  return PILLAR_COPY[p]?.title ?? p;
}
