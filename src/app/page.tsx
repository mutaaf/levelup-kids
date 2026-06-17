import { redirect } from "next/navigation";
import {
  createServerSupabase,
  createServiceSupabase,
} from "@/lib/supabase/server";
import { Landing } from "@/components/landing/Landing";
import { ParentDashboard } from "@/components/dashboard/ParentDashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  // All approved completions for total XP.
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
  const totals = new Map<string, { xp: number; doneToday: number; total: number }>();
  for (const c of children) {
    totals.set(c.id as string, { xp: 0, doneToday: 0, total: 0 });
  }
  for (const q of todaysQuests ?? []) {
    const t = totals.get(q.child_id as string);
    if (t) t.total += 1;
  }
  const approvedTodayQuestIds = new Set<string>();
  for (const comp of allCompletions ?? []) {
    if (comp.approved_at) {
      const t = totals.get(comp.child_id as string);
      if (t) t.xp += (comp.xp_awarded as number | null) ?? 0;
      // Track which quest ids were approved (for today-counter).
      approvedTodayQuestIds.add(comp.quest_id as string);
    }
  }
  for (const q of todaysQuests ?? []) {
    if (approvedTodayQuestIds.has(q.id as string)) {
      const t = totals.get(q.child_id as string);
      if (t) t.doneToday += 1;
    }
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
      parentName={(parent.name as string | null) ?? ""}
      focusPillars={focusPillars as never}
      children={childCards}
      pendingApprovals={pendingApprovals}
    />
  );
}
