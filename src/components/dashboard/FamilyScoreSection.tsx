import "server-only";
import { scoreByPillar } from "@/lib/growth/score";
import { getCachedApprovedCompletions } from "@/lib/data/cached";
import { FamilyGrowthRadar } from "@/components/growth/FamilyGrowthRadar";
import { ShareScoreButton } from "@/components/growth/ShareScoreButton";
import type { PillarSlug } from "@/lib/types/pillar";

// Streamed section. Async server component — the parent dashboard wraps
// it in <Suspense> so the header + child cards paint immediately while
// the score crunch (loads every approved completion, computes 8 pillar
// scores) streams in.

export async function FamilyScoreSection({
  householdId,
  householdName,
  focusPillars,
  childrenCount,
}: {
  householdId: string;
  householdName: string;
  focusPillars: PillarSlug[];
  childrenCount: number;
}) {
  // Cached per-household; invalidated via revalidateTag('household:X')
  // whenever a quest is approved or unapproved.
  const completions = await getCachedApprovedCompletions(householdId);
  const growthScores = scoreByPillar({
    focusPillars,
    childrenCount: childrenCount || 1,
    completions: completions.map((c) => ({
      pillar: c.pillar,
      approvedAt: c.approvedAt,
    })),
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
      <div className="flex flex-col items-center gap-4 rounded-3xl bg-card p-5 shadow-sm sm:p-6">
        <FamilyGrowthRadar scores={growthScores} size={260} />
        <ShareScoreButton householdName={householdName} />
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
