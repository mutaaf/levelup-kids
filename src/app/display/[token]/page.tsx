import { notFound } from "next/navigation";
import { createServiceSupabase } from "@/lib/supabase/server";
import { resolveDisplayToken } from "@/lib/display/tokens";
import { HouseholdLeaderboard } from "@/components/display/HouseholdLeaderboard";
import type { PillarSlug } from "@/lib/types/pillar";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ token: string }>;
};

export default async function DisplayPage({ params }: Props) {
  const { token } = await params;
  const resolved = await resolveDisplayToken(token);
  if (!resolved) notFound();
  const { householdId } = resolved;

  const svc = createServiceSupabase();

  const [{ data: household }, { data: kids }] = await Promise.all([
    svc
      .from("households")
      .select("name, focus_pillars")
      .eq("id", householdId)
      .maybeSingle(),
    svc
      .from("children")
      .select("id, name, age, avatar")
      .eq("household_id", householdId)
      .order("age", { ascending: false }),
  ]);

  if (!household || !kids || kids.length === 0) notFound();

  const childIds = kids.map((c) => c.id as string);
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: todaysQuests }, { data: allCompletions }, { data: recentWins }] =
    await Promise.all([
      svc
        .from("quests")
        .select("id, child_id, pillar")
        .in("child_id", childIds)
        .eq("type", "daily")
        .eq("assigned_for", today),
      svc
        .from("quest_completions")
        .select("id, child_id, xp_awarded, approved_at, quest_id")
        .in("child_id", childIds),
      svc
        .from("quest_completions")
        .select(
          "id, child_id, approved_at, xp_awarded, quests:quests(title, pillar), children:children(name, avatar)",
        )
        .in("child_id", childIds)
        .not("approved_at", "is", null)
        .order("approved_at", { ascending: false })
        .limit(8),
    ]);

  // Build per-child rollups.
  type ChildView = {
    childId: string;
    name: string;
    avatar: string;
    totalXp: number;
    todayDone: number;
    todayTotal: number;
    todayPillars: PillarSlug[]; // tinted dot per slot, in seeded order
    todayPillarsDone: boolean[]; // matches todayPillars by order
    streak: number;
  };

  const xpByChild = new Map<string, number>();
  const approvedQuestIds = new Set<string>();
  for (const c of allCompletions ?? []) {
    if (c.approved_at) {
      xpByChild.set(
        c.child_id as string,
        (xpByChild.get(c.child_id as string) ?? 0) + ((c.xp_awarded as number) ?? 0),
      );
      approvedQuestIds.add(c.quest_id as string);
    }
  }

  // Streak per child: distinct days with at least one approved completion,
  // backward from today, contiguous.
  const dayKeysByChild = new Map<string, Set<string>>();
  for (const c of allCompletions ?? []) {
    if (!c.approved_at) continue;
    const day = (c.approved_at as string).slice(0, 10);
    const set = dayKeysByChild.get(c.child_id as string) ?? new Set();
    set.add(day);
    dayKeysByChild.set(c.child_id as string, set);
  }
  function streakFor(childId: string): number {
    const set = dayKeysByChild.get(childId);
    if (!set) return 0;
    let streak = 0;
    for (let i = 0; i < 60; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      if (set.has(key)) streak += 1;
      else if (i > 0) break; // today missing is OK; tomorrow start interrupts
      else continue;
    }
    return streak;
  }

  // Per-child quest slot list with pillars + done state.
  const slotsByChild = new Map<string, { pillar: PillarSlug; done: boolean }[]>();
  for (const q of todaysQuests ?? []) {
    const arr = slotsByChild.get(q.child_id as string) ?? [];
    arr.push({
      pillar: q.pillar as PillarSlug,
      done: approvedQuestIds.has(q.id as string),
    });
    slotsByChild.set(q.child_id as string, arr);
  }

  const kidViews: ChildView[] = kids.map((c) => {
    const slots = slotsByChild.get(c.id as string) ?? [];
    return {
      childId: c.id as string,
      name: c.name as string,
      avatar: c.avatar as string,
      totalXp: xpByChild.get(c.id as string) ?? 0,
      todayDone: slots.filter((s) => s.done).length,
      todayTotal: slots.length,
      todayPillars: slots.map((s) => s.pillar),
      todayPillarsDone: slots.map((s) => s.done),
      streak: streakFor(c.id as string),
    };
  });

  // Recent wins for the ticker.
  const wins = (recentWins ?? []).map((w) => {
    const child = w.children as unknown as { name: string; avatar: string } | null;
    const quest = w.quests as unknown as { title: string; pillar: PillarSlug } | null;
    return {
      id: w.id as number,
      childName: child?.name ?? "",
      childAvatar: child?.avatar ?? "🦊",
      questTitle: quest?.title ?? "",
      pillar: (quest?.pillar ?? "scholar") as PillarSlug,
      xp: (w.xp_awarded as number) ?? 5,
      approvedAt: w.approved_at as string,
    };
  });

  return (
    <HouseholdLeaderboard
      householdId={householdId}
      householdName={(household.name as string) ?? "Your household"}
      focusPillars={
        ((household.focus_pillars as string[] | null) ?? []) as PillarSlug[]
      }
      kids={kidViews}
      wins={wins}
      displayLabel={resolved.label}
    />
  );
}
