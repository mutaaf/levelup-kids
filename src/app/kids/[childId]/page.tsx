import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  createServerSupabase,
  createServiceSupabase,
} from "@/lib/supabase/server";
import { level } from "@/lib/growth/level";
import { QuestCard } from "@/components/quests/QuestCard";
import type { PillarSlug } from "@/lib/types/pillar";

export const dynamic = "force-dynamic";

type ChildDashProps = {
  params: Promise<{ childId: string }>;
};

export default async function ChildDashboardPage({ params }: ChildDashProps) {
  const { childId } = await params;

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/signin?next=/kids/${childId}`);

  const svc = createServiceSupabase();
  const { data: parent } = await svc
    .from("parents")
    .select("household_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!parent?.household_id) redirect("/onboarding/household");

  const { data: child } = await svc
    .from("children")
    .select("id, name, age, avatar, household_id")
    .eq("id", childId)
    .maybeSingle();
  if (!child || child.household_id !== parent.household_id) notFound();

  const today = new Date().toISOString().slice(0, 10);
  const { data: quests } = await svc
    .from("quests")
    .select("id, title, description, pillar, xp_reward, assigned_for, type")
    .eq("child_id", childId)
    .eq("type", "daily")
    .eq("assigned_for", today)
    .order("id");

  const questIds = (quests ?? []).map((q) => q.id as string);
  const { data: completions } = await svc
    .from("quest_completions")
    .select("id, quest_id, approved_at, xp_awarded")
    .in(
      "quest_id",
      questIds.length > 0
        ? questIds
        : ["00000000-0000-0000-0000-000000000000"],
    );
  const compByQuest = new Map<string, { approved: boolean }>();
  for (const c of completions ?? []) {
    compByQuest.set(c.quest_id as string, { approved: !!c.approved_at });
  }

  // Totals + streak for the hero.
  const { data: allCompletions } = await svc
    .from("quest_completions")
    .select("xp_awarded, approved_at")
    .eq("child_id", childId);
  let totalXp = 0;
  const dayKeys = new Set<string>();
  for (const c of allCompletions ?? []) {
    if (c.approved_at) {
      totalXp += (c.xp_awarded as number | null) ?? 0;
      dayKeys.add((c.approved_at as string).slice(0, 10));
    }
  }
  let streak = 0;
  for (let i = 0; i < 60; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (dayKeys.has(key)) streak += 1;
    else if (i > 0) break;
  }

  const lvl = level(totalXp);
  const xpInLevel = totalXp % 100;

  const todayDone = (quests ?? []).filter((q) =>
    compByQuest.get(q.id as string)?.approved,
  ).length;
  const todayTotal = (quests ?? []).length;
  const allDone = todayTotal > 0 && todayDone === todayTotal;

  return (
    <main className="mx-auto flex min-h-dvh max-w-screen-md flex-col gap-8 px-5 py-6 pb-32 sm:px-8 sm:py-10">
      <header>
        {/* Hard nav — see comment in /settings/page.tsx. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full bg-card px-4 py-2 text-sm font-medium text-ink-secondary shadow-sm transition-colors hover:bg-tinted"
        >
          <span aria-hidden>←</span>
          Back to family
        </a>
      </header>

      <section
        className="relative flex flex-col items-center gap-5 rounded-3xl px-6 py-10 shadow-lg"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 0%, color-mix(in srgb, var(--brand-500) 12%, var(--surface-card)) 0%, var(--surface-card) 60%)",
        }}
      >
        <div className="relative">
          <div
            className="flex items-center justify-center rounded-full bg-paper shadow-md"
            style={{
              width: "clamp(180px, 38vw, 240px)",
              height: "clamp(180px, 38vw, 240px)",
              fontSize: "clamp(110px, 22vw, 144px)",
              lineHeight: 1,
              boxShadow:
                "inset 0 0 0 6px color-mix(in srgb, var(--brand-500) 18%, transparent), 0 12px 32px -8px rgba(31, 27, 22, 0.18)",
            }}
            aria-hidden
          >
            {child.avatar as string}
          </div>
          <span
            className="absolute -right-3 -bottom-2 rounded-full bg-brand-500 px-4 py-1.5 font-bold text-white shadow-md"
            aria-label={`Level ${lvl}`}
            style={{
              fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif",
              fontSize: "1.5rem",
              letterSpacing: "-0.02em",
            }}
          >
            Lvl {lvl}
          </span>
        </div>

        <h1
          className="font-display text-center"
          style={{
            fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif",
            fontSize: "clamp(40px, 9vw, 64px)",
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          {child.name as string}
        </h1>

        {streak >= 3 && (
          <div
            className="flex items-center gap-2 rounded-full px-4 py-2 text-base font-bold"
            style={{
              color: "var(--warning)",
              backgroundColor:
                "color-mix(in srgb, var(--warning) 15%, transparent)",
            }}
          >
            <span className="text-xl" aria-hidden>
              🔥
            </span>
            {streak}-day streak
          </div>
        )}

        <div className="w-full max-w-md">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-sm font-bold text-ink-secondary">
              {xpInLevel} XP
            </span>
            <span className="text-sm font-medium text-ink-muted">
              {100 - xpInLevel} more for Lvl {lvl + 1}
            </span>
          </div>
          <div
            className="overflow-hidden rounded-full bg-tinted"
            style={{ height: "18px" }}
          >
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-700"
              style={{ width: `${xpInLevel}%` }}
            />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h2
            className="font-display"
            style={{
              fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif",
              fontSize: "1.875rem",
              letterSpacing: "-0.01em",
            }}
          >
            Today&apos;s quests
          </h2>
          {todayTotal > 0 && (
            <span className="text-base font-bold text-ink-secondary">
              {allDone
                ? `🎉 ${todayDone} / ${todayTotal}`
                : `${todayDone} / ${todayTotal}`}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {(quests ?? []).map((q) => {
            const comp = compByQuest.get(q.id as string);
            const state: "idle" | "ready" | "approved" = !comp
              ? "idle"
              : comp.approved
                ? "approved"
                : "ready";
            return (
              <QuestCard
                key={q.id as string}
                questId={q.id as string}
                title={q.title as string}
                description={q.description as string}
                pillar={q.pillar as PillarSlug}
                xpReward={(q.xp_reward as number | null) ?? 5}
                state={state}
              />
            );
          })}
          {(quests ?? []).length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-3xl bg-card p-10 text-center shadow-md">
              <span className="text-5xl" aria-hidden>
                🌙
              </span>
              <p className="text-lg font-medium text-ink-secondary">
                No quests for today yet. Come back tomorrow morning.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
