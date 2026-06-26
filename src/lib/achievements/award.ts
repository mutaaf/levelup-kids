// Server-only. Called from approveQuest right after the XP/approval lands.
// Builds the child's current stats snapshot, runs every badge's check(),
// inserts rows for any newly-earned ones. Idempotent via the unique
// (child_id, badge_id) constraint — duplicates fail silently.

import { createServiceSupabase } from "@/lib/supabase/server";
import { level } from "@/lib/growth/level";
import { scoreByPillar } from "@/lib/growth/score";
import type { PillarSlug } from "@/lib/types/pillar";
import { PILLARS } from "@/lib/types/pillar";
import { BADGES, type ChildStatsSnapshot } from "./badges";

function zerosByPillar(): Record<PillarSlug, number> {
  const out = {} as Record<PillarSlug, number>;
  for (const p of PILLARS) out[p] = 0;
  return out;
}

export async function evaluateAndAwardBadges(args: {
  childId: string;
}): Promise<{ awarded: string[] }> {
  const svc = createServiceSupabase();

  // 1. Child + household context.
  const { data: child } = await svc
    .from("children")
    .select("id, household_id")
    .eq("id", args.childId)
    .maybeSingle();
  if (!child) return { awarded: [] };
  const householdId = child.household_id as string;

  const { data: household } = await svc
    .from("households")
    .select("focus_pillars")
    .eq("id", householdId)
    .maybeSingle();
  const focusPillars = (household?.focus_pillars as PillarSlug[] | null) ?? [];

  // 2. All approved completions for this child (with the quest's pillar)
  //    + sibling counts for the family score.
  const { data: completions } = await svc
    .from("quest_completions")
    .select(
      "child_id, xp_awarded, approved_at, quests:quests(pillar)",
    )
    .not("approved_at", "is", null);

  // Build per-child total XP for this child, plus per-pillar counts.
  let totalXp = 0;
  const approvedByPillar = zerosByPillar();
  const pillarDayKeys: Record<PillarSlug, Set<string>> = {
    scholar: new Set(),
    athlete: new Set(),
    builder: new Set(),
    creator: new Set(),
    leader: new Set(),
    character: new Set(),
    explorer: new Set(),
    purpose: new Set(),
  };
  const dayKeys = new Set<string>();
  const now = Date.now();
  const WINDOW_MS = 28 * 24 * 60 * 60 * 1000;

  // Approved completions across the entire household (for the family score).
  const completionsForScore: { pillar: PillarSlug; approvedAt: string }[] = [];

  for (const c of completions ?? []) {
    if (!c.approved_at) continue;
    const pillar =
      ((c.quests as unknown as { pillar?: PillarSlug } | null)?.pillar ??
        "scholar") as PillarSlug;
    const approvedAt = c.approved_at as string;
    completionsForScore.push({ pillar, approvedAt });

    if (c.child_id !== args.childId) continue;
    totalXp += (c.xp_awarded as number | null) ?? 0;
    const day = approvedAt.slice(0, 10);
    dayKeys.add(day);
    const ageMs = now - new Date(approvedAt).getTime();
    if (ageMs <= WINDOW_MS) {
      approvedByPillar[pillar] += 1;
      pillarDayKeys[pillar].add(day);
    }
  }

  // Streak = consecutive days backward from today with ≥1 approved completion.
  let streakDays = 0;
  for (let i = 0; i < 60; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (dayKeys.has(key)) streakDays += 1;
    else if (i > 0) break;
  }

  // Family Growth Score (max across focus pillars).
  const { data: kidsRows } = await svc
    .from("children")
    .select("id")
    .eq("household_id", householdId);
  const childrenCount = kidsRows?.length ?? 1;
  const scores = scoreByPillar({
    focusPillars,
    childrenCount,
    completions: completionsForScore,
  });
  let familyMaxScore = 0;
  for (const p of focusPillars) {
    const v = scores[p];
    if (typeof v === "number" && v > familyMaxScore) familyMaxScore = v;
  }

  const pillarDaysIn28 = zerosByPillar();
  for (const p of PILLARS) pillarDaysIn28[p] = pillarDayKeys[p].size;

  const snapshot: ChildStatsSnapshot = {
    totalXp,
    level: level(totalXp),
    streakDays,
    approvedByPillar,
    pillarDaysIn28,
    familyMaxScore,
  };

  // 3. Run every badge's check, insert any earned.
  const eligible = BADGES.filter((b) => b.check(snapshot));
  if (eligible.length === 0) return { awarded: [] };

  const { data: alreadyEarned } = await svc
    .from("child_achievements")
    .select("badge_id")
    .eq("child_id", args.childId)
    .in(
      "badge_id",
      eligible.map((b) => b.id),
    );
  const earnedIds = new Set(
    (alreadyEarned ?? []).map((r) => r.badge_id as string),
  );

  const toAward = eligible.filter((b) => !earnedIds.has(b.id));
  if (toAward.length === 0) return { awarded: [] };

  await svc.from("child_achievements").insert(
    toAward.map((b) => ({
      child_id: args.childId,
      badge_id: b.id,
    })),
  );

  return { awarded: toAward.map((b) => b.id) };
}
