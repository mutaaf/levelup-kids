import { redirect } from "next/navigation";
import {
  createServiceSupabase,
  getSessionUser,
} from "@/lib/supabase/server";
import { Landing } from "@/components/landing/Landing";
import { ParentDashboard } from "@/components/dashboard/ParentDashboard";
import { scoreByPillar } from "@/lib/growth/score";
import type { PillarSlug } from "@/lib/types/pillar";

export const dynamic = "force-dynamic";

export default async function Home() {
  // getSessionUser reads cookies without triggering a refresh — server
  // components can't write rotated cookies. Middleware does the refresh.
  const user = await getSessionUser();
  if (!user) return <Landing />;

  const svc = createServiceSupabase();
  const { data: parent } = await svc
    .from("parents")
    .select("household_id, name")
    .eq("id", user.id)
    .maybeSingle();

  if (!parent?.household_id) redirect("/onboarding/household");

  const { data: household } = await svc
    .from("households")
    .select("name, focus_pillars")
    .eq("id", parent.household_id)
    .maybeSingle();

  const focusPillars =
    (household?.focus_pillars as string[] | null | undefined) ?? [];

  // If no pillars selected, the onboarding is incomplete.
  if (focusPillars.length === 0) redirect("/onboarding/pillars");

  const { data: children } = await svc
    .from("children")
    .select("id, name, age, avatar")
    .eq("household_id", parent.household_id)
    .order("age", { ascending: true });

  if (!children || children.length === 0) redirect("/onboarding/children");

  const childIds = children.map((c) => c.id as string);
  const today = new Date().toISOString().slice(0, 10);

  // Today's quests for the today completion count.
  const { data: todaysQuests } = await svc
    .from("quests")
    .select("id, child_id")
    .in("child_id", childIds)
    .eq("type", "daily")
    .eq("assigned_for", today);

  // All approved completions for total XP — join the quest's pillar
  // for the Family Growth Score.
  const { data: allCompletions } = await svc
    .from("quest_completions")
    .select("id, child_id, xp_awarded, approved_at, quest_id, quests:quests(pillar)")
    .in("child_id", childIds);

  // Pending completions (awaiting approval) joined with quests + children.
  const { data: pending } = await svc
    .from("quest_completions")
    .select(
      "id, child_id, quests:quests(title, pillar, xp_reward), children:children(name, avatar)",
    )
    .in("child_id", childIds)
    .is("approved_at", null)
    .order("completed_at", { ascending: true });

  // Compute per-child totals.
  const totals = new Map<
    string,
    { xp: number; doneToday: number; total: number; days: Set<string> }
  >();
  for (const c of children) {
    totals.set(c.id as string, {
      xp: 0,
      doneToday: 0,
      total: 0,
      days: new Set<string>(),
    });
  }
  for (const q of todaysQuests ?? []) {
    const t = totals.get(q.child_id as string);
    if (t) t.total += 1;
  }
  const approvedTodayQuestIds = new Set<string>();
  for (const comp of allCompletions ?? []) {
    if (comp.approved_at) {
      const t = totals.get(comp.child_id as string);
      if (t) {
        t.xp += (comp.xp_awarded as number | null) ?? 0;
        t.days.add((comp.approved_at as string).slice(0, 10));
      }
      approvedTodayQuestIds.add(comp.quest_id as string);
    }
  }
  for (const q of todaysQuests ?? []) {
    if (approvedTodayQuestIds.has(q.id as string)) {
      const t = totals.get(q.child_id as string);
      if (t) t.doneToday += 1;
    }
  }

  // Streak per child = consecutive days backward from today with ≥1 approval.
  function streakFor(days: Set<string>): number {
    let streak = 0;
    for (let i = 0; i < 60; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      if (days.has(key)) streak += 1;
      else if (i > 0) break;
    }
    return streak;
  }

  // Badge counts per child.
  const { data: badgesByChild } = await svc
    .from("child_achievements")
    .select("child_id")
    .in("child_id", childIds);
  const badgeCountByChild = new Map<string, number>();
  for (const row of badgesByChild ?? []) {
    const id = row.child_id as string;
    badgeCountByChild.set(id, (badgeCountByChild.get(id) ?? 0) + 1);
  }

  const childCards = children.map((c) => {
    const t = totals.get(c.id as string)!;
    return {
      childId: c.id as string,
      name: c.name as string,
      avatar: c.avatar as string,
      totalXp: t.xp,
      todayDone: t.doneToday,
      todayTotal: t.total,
      streakDays: streakFor(t.days),
      badgeCount: badgeCountByChild.get(c.id as string) ?? 0,
    };
  });

  const pendingApprovals = (pending ?? []).map((p) => {
    const quest = p.quests as unknown as {
      title: string;
      pillar: string;
      xp_reward: number;
    };
    const child = p.children as unknown as { name: string; avatar: string };
    return {
      completionId: p.id as string,
      childId: p.child_id as string,
      childName: child?.name ?? "",
      childAvatar: child?.avatar ?? "🦊",
      questTitle: quest?.title ?? "",
      pillar: (quest?.pillar ?? "scholar") as never,
      xpReward: quest?.xp_reward ?? 5,
    };
  });

  // Family Growth Score per pillar (28-day window).
  const approvedForScore = (allCompletions ?? [])
    .filter((c) => c.approved_at)
    .map((c) => {
      const q = c.quests as unknown as { pillar: PillarSlug } | null;
      return {
        pillar: (q?.pillar ?? "scholar") as PillarSlug,
        approvedAt: c.approved_at as string,
      };
    });
  const growthScores = scoreByPillar({
    focusPillars: focusPillars as PillarSlug[],
    childrenCount: children.length,
    completions: approvedForScore,
  });

  return (
    <ParentDashboard
      householdName={household?.name ?? "Your household"}
      parentName={(parent.name as string | null) ?? ""}
      focusPillars={focusPillars as never}
      kids={childCards}
      pendingApprovals={pendingApprovals}
      growthScores={growthScores}
    />
  );
}
