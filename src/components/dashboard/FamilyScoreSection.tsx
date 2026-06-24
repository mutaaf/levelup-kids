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
    <section className="flex flex-col gap-4">
      <h2
        className="font-display"
        style={{
          fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif",
          fontSize: "1.75rem",
          letterSpacing: "-0.015em",
        }}
      >
        This month
      </h2>
      <div className="flex flex-col items-center gap-6 rounded-3xl bg-card p-6 shadow-md sm:p-8">
        <FamilyGrowthRadar scores={growthScores} />
        <ShareScoreButton householdName={householdName} />
      </div>
    </section>
  );
}

/** Skeleton shown while FamilyScoreSection streams in. Same shape so
 *  the layout doesn't jump when the radar swaps in. */
export function FamilyScoreSkeleton() {
  return (
    <section className="flex flex-col gap-4">
      <h2
        className="font-display"
        style={{
          fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif",
          fontSize: "1.75rem",
          letterSpacing: "-0.015em",
        }}
      >
        This month
      </h2>
      <div className="flex flex-col items-center gap-6 rounded-3xl bg-card p-6 shadow-md sm:p-8">
        <div
          className="size-[280px] animate-pulse rounded-full sm:size-[360px]"
          style={{
            background:
              "radial-gradient(closest-side, color-mix(in srgb, var(--brand-500) 8%, transparent), transparent)",
          }}
          aria-hidden
        />
        <div className="h-10 w-56 animate-pulse rounded-full bg-tinted" />
        <p className="sr-only">Loading this month&apos;s score…</p>
      </div>
    </section>
  );
}
