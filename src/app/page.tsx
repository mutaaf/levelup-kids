import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createServiceSupabase } from "@/lib/supabase/server";
import {
  getCurrentUser,
  getCurrentParent,
  getCurrentHousehold,
  getCurrentChildren,
} from "@/lib/data/current";
import { Landing } from "@/components/landing/Landing";
import { ParentDashboard } from "@/components/dashboard/ParentDashboard";
import {
  FamilyScoreSection,
  FamilyScoreSkeleton,
} from "@/components/dashboard/FamilyScoreSection";
import type { PillarSlug } from "@/lib/types/pillar";

export const dynamic = "force-dynamic";

export default async function Home() {
  // All four getters below are React.cache()-wrapped — multiple callers
  // in the same request share one DB roundtrip. See src/lib/data/current.ts.
  const user = await getCurrentUser();
  if (!user) return <Landing />;

  const parent = await getCurrentParent();
  if (!parent?.household_id) redirect("/onboarding/household");

  const household = await getCurrentHousehold();
  const focusPillars = household?.focus_pillars ?? [];
  if (focusPillars.length === 0) redirect("/onboarding/pillars");

  const children = await getCurrentChildren();
  if (children.length === 0) redirect("/onboarding/children");

  const svc = createServiceSupabase();
  const childIds = children.map((c) => c.id);
  const today = new Date().toISOString().slice(0, 10);

  // Today's quests for the today completion count.
  const { data: todaysQuests } = await svc
    .from("quests")
    .select("id, child_id")
    .in("child_id", childIds)
    .eq("type", "daily")
    .eq("assigned_for", today);

  // Approved completions for the per-child XP totals. The Family Growth
  // Score crunch (loads the same set, joined with quest pillar) lives in
  // <FamilyScoreSection> and streams in via Suspense.
  const { data: allCompletions } = await svc
    .from("quest_completions")
    .select("id, child_id, xp_awarded, approved_at, quest_id")
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

  return (
    <ParentDashboard
      householdName={household?.name ?? "Your household"}
      parentName={parent.name ?? ""}
      focusPillars={focusPillars as PillarSlug[]}
      kids={childCards}
      pendingApprovals={pendingApprovals}
      scoreSlot={
        <Suspense fallback={<FamilyScoreSkeleton />}>
          <FamilyScoreSection
            householdId={household!.id}
            householdName={household!.name}
            focusPillars={focusPillars as PillarSlug[]}
            childrenCount={children.length}
          />
        </Suspense>
      }
    />
  );
}
