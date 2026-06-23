import { cookies as nextCookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createServerSupabase,
  createServiceSupabase,
  getSessionUser,
} from "@/lib/supabase/server";
import { Landing } from "@/components/landing/Landing";
import { ParentDashboard } from "@/components/dashboard/ParentDashboard";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { scoreByPillar } from "@/lib/growth/score";
import type { PillarSlug } from "@/lib/types/pillar";

export const dynamic = "force-dynamic";

export default async function Home() {
  // getSessionUser reads the cookie WITHOUT triggering a refresh.
  let user = await getSessionUser();
  let getUserFallbackUsed = false;
  let getUserErr: string | null = null;

  // If getSession returned null, try getUser as a fallback — sometimes
  // getSession is more strict than getUser about reading the cookie.
  if (!user) {
    const supabase = await createServerSupabase();
    const r = await supabase.auth.getUser();
    if (r.data.user) {
      user = r.data.user;
      getUserFallbackUsed = true;
    } else {
      getUserErr = r.error?.message ?? null;
    }
  }

  // DIAGNOSTIC: if STILL no user but cookies are present, render the
  // diagnostic page instead of Landing.
  if (!user) {
    const store = await nextCookies();
    const sbCookies = store
      .getAll()
      .map((c) => c.name)
      .filter((n) => n.startsWith("sb-"));
    if (sbCookies.length > 0) {
      console.warn(
        `[/] no user but sb cookies present (${sbCookies.join(",")}) — getSession null + getUser err=${getUserErr ?? "none"}`,
      );
      return (
        <main className="mx-auto flex min-h-dvh max-w-screen-md flex-col gap-6 px-6 py-12">
          <h1
            className="font-display text-3xl"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            Session read failed on this page
          </h1>
          <p className="text-ink-secondary">
            Your sign-in cookies are present but the server couldn&apos;t
            validate them on this request.
          </p>
          <div className="rounded-2xl bg-tinted p-5 font-mono text-xs">
            <p>
              <strong>sb cookies present:</strong>
            </p>
            <pre className="mt-2 whitespace-pre-wrap break-all">
              {sbCookies.join("\n")}
            </pre>
            <p className="mt-3">
              <strong>getSession returned:</strong> null
            </p>
            <p className="mt-1">
              <strong>getUser error:</strong> {getUserErr ?? "(none)"}
            </p>
          </div>
          <div className="flex gap-3">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/api/debug/whoami" className="btn-primary">
              Open whoami JSON
            </a>
            <SignOutButton className="btn-secondary">
              Sign out + start over
            </SignOutButton>
          </div>
        </main>
      );
    }
    return <Landing />;
  }

  // If we got here via the getUser fallback, log it so we can see in Vercel
  // logs how often getSession is failing where getUser succeeds.
  if (getUserFallbackUsed) {
    console.warn(`[/] getSession null but getUser succeeded for ${user.id}`);
  }

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
