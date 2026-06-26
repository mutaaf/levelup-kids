import "server-only";
import { familyScoreByPillar } from "@/lib/growth/score";
import { buildPillarBreakdowns } from "@/lib/growth/breakdown";
import { getCachedApprovedCompletions } from "@/lib/data/cached";
import { getCurrentChildren } from "@/lib/data/current";
import { InteractiveFamilyScore } from "@/components/growth/InteractiveFamilyScore";
import type { PillarSlug } from "@/lib/types/pillar";

// Streamed section. Async server component — the parent dashboard wraps
// it in <Suspense> so the header + child cards paint immediately while
// the score crunch (loads every approved completion, computes 8 pillar
// scores) streams in.

export async function FamilyScoreSection({
  householdId,
  householdName,
  focusPillars,
}: {
  householdId: string;
  householdName: string;
  /** Household default — used for kids who haven't picked their own yet. */
  focusPillars: PillarSlug[];
}) {
  // Cached per-household; invalidated via revalidateTag('household:X')
  // whenever a quest is approved or unapproved.
  const completions = await getCachedApprovedCompletions(householdId);

  // cache() dedupe means getCurrentChildren reuses the dashboard's earlier
  // query — no extra round-trip.
  const kids = await getCurrentChildren();

  // Per-child scoring is the load-bearing model: each kid is scored against
  // their OWN focus pillars (falling back to the household default), then
  // averaged per pillar across the kids who focus on it.
  const completionsByChild = new Map<
    string,
    Array<{ pillar: PillarSlug; approvedAt: string }>
  >();
  for (const k of kids) completionsByChild.set(k.id, []);
  for (const c of completions) {
    completionsByChild
      .get(c.childId)
      ?.push({ pillar: c.pillar, approvedAt: c.approvedAt });
  }
  const growthScores = familyScoreByPillar({
    children: kids.map((k) => ({
      childId: k.id,
      focusPillars: k.focusPillars.length > 0 ? k.focusPillars : focusPillars,
      completions: completionsByChild.get(k.id) ?? [],
    })),
  });

  // Per-pillar breakdown powers the drill-in drawer.
  const breakdowns = buildPillarBreakdowns({
    children: kids,
    completions,
  });

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-bold tracking-widest text-ink-muted uppercase">
          This month
        </h2>
        <span className="text-xs font-semibold text-ink-muted">
          Family Growth Score
        </span>
      </div>
      <div className="rounded-3xl bg-card p-5 shadow-sm sm:p-6">
        <InteractiveFamilyScore
          householdName={householdName}
          scores={growthScores}
          breakdowns={breakdowns}
        />
      </div>
    </section>
  );
}

/** Skeleton shown while FamilyScoreSection streams in. Matches the
 *  secondary-tier compact layout so the page doesn't jump. */
export function FamilyScoreSkeleton() {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-bold tracking-widest text-ink-muted uppercase">
          This month
        </h2>
        <span className="text-xs font-semibold text-ink-muted">
          Family Growth Score
        </span>
      </div>
      <div className="flex flex-col items-center gap-4 rounded-3xl bg-card p-5 shadow-sm sm:p-6">
        <div
          className="size-[220px] animate-pulse rounded-full sm:size-[260px]"
          style={{
            background:
              "radial-gradient(closest-side, color-mix(in srgb, var(--brand-500) 8%, transparent), transparent)",
          }}
          aria-hidden
        />
        <div className="h-9 w-48 animate-pulse rounded-full bg-tinted" />
        <p className="sr-only">Loading this month&apos;s score…</p>
      </div>
    </section>
  );
}
