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

  // Get completions for these quest ids (to determine state).
  const questIds = (quests ?? []).map((q) => q.id as string);
  const { data: completions } = await svc
    .from("quest_completions")
    .select("id, quest_id, approved_at, xp_awarded")
    .in("quest_id", questIds.length > 0 ? questIds : ["00000000-0000-0000-0000-000000000000"]);
  const compByQuest = new Map<string, { approved: boolean }>();
  for (const c of completions ?? []) {
    compByQuest.set(c.quest_id as string, { approved: !!c.approved_at });
  }

  // Compute totalXp for this child from ALL approved completions.
  const { data: allCompletions } = await svc
    .from("quest_completions")
    .select("xp_awarded, approved_at")
    .eq("child_id", childId);
  let totalXp = 0;
  for (const c of allCompletions ?? []) {
    if (c.approved_at) totalXp += (c.xp_awarded as number | null) ?? 0;
  }
  const lvl = level(totalXp);
  const xpInLevel = totalXp % 100;

  return (
    <main className="mx-auto flex min-h-dvh max-w-screen-md flex-col gap-8 px-6 py-10 pb-32">
      <header>
        <Link
          href="/"
          className="text-sm text-ink-secondary underline-offset-2 hover:underline"
        >
          ← Back to family
        </Link>
      </header>

      <section className="flex flex-col items-center gap-4 py-4">
        <div className="relative">
          <div
            className="flex size-36 items-center justify-center rounded-full bg-tinted text-7xl"
            aria-hidden
          >
            {child.avatar as string}
          </div>
          <span
            className="absolute right-0 bottom-2 rounded-full bg-brand-500 px-3 py-1 text-base font-bold text-white shadow-sm"
            aria-label={`Level ${lvl}`}
          >
            Lvl {lvl}
          </span>
        </div>
        <h1
          className="font-display"
          style={{
            fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif",
            fontSize: "var(--text-h1)",
            lineHeight: 1.1,
          }}
        >
          {child.name as string}
        </h1>
        <div className="w-full max-w-xs">
          <div className="mb-1 flex justify-between text-xs text-ink-secondary">
            <span>{xpInLevel} XP</span>
            <span>{100 - xpInLevel} to next level</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-tinted">
            <div
              className="h-full bg-brand-500 transition-all duration-500"
              style={{ width: `${xpInLevel}%` }}
            />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium tracking-widest text-ink-secondary uppercase">
          Today&apos;s quests
        </h2>
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
            <p className="rounded-lg bg-card p-5 text-sm text-ink-secondary">
              No quests for today yet. Come back tomorrow morning.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
