"use client";

import { useState } from "react";
import Link from "next/link";
import { PILLARS, type PillarSlug } from "@/lib/types/pillar";
import { PILLAR_COPY } from "@/lib/pillars/copy";
import { FamilyGrowthRadar } from "@/components/growth/FamilyGrowthRadar";
import { ShareScoreButton } from "@/components/growth/ShareScoreButton";
import type { PillarBreakdown } from "@/lib/growth/breakdown";

export type InteractiveFamilyScoreProps = {
  householdName: string;
  scores: Record<PillarSlug, number | null>;
  breakdowns: Record<PillarSlug, PillarBreakdown>;
};

// Wraps the radar with an interactive per-pillar drill-in. Each scored
// pillar gets a row below the radar; tapping opens an inline panel
// showing contributors + recent quests + a "open <kid>'s quests" CTA
// so the parent can act on the insight, not just admire it.

export function InteractiveFamilyScore({
  householdName,
  scores,
  breakdowns,
}: InteractiveFamilyScoreProps) {
  const [openPillar, setOpenPillar] = useState<PillarSlug | null>(null);

  const scoredPillars = PILLARS.filter((p) => scores[p] != null).sort(
    (a, b) => (scores[b] ?? 0) - (scores[a] ?? 0),
  );

  return (
    <div className="flex flex-col gap-4">
      <FamilyGrowthRadar scores={scores} size={260} />
      <ShareScoreButton householdName={householdName} />

      {scoredPillars.length > 0 && (
        <div className="w-full">
          <p className="mb-2 text-xs font-bold tracking-widest text-ink-muted uppercase">
            Tap a pillar to see what counted
          </p>
          <ul className="flex flex-col gap-2">
            {scoredPillars.map((pillar) => {
              const isOpen = openPillar === pillar;
              const score = scores[pillar] ?? 0;
              const copy = PILLAR_COPY[pillar];
              const breakdown = breakdowns[pillar];
              return (
                <li key={pillar}>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenPillar((cur) => (cur === pillar ? null : pillar))
                    }
                    aria-expanded={isOpen}
                    aria-controls={`pillar-${pillar}-panel`}
                    className="flex w-full items-center gap-3 rounded-2xl bg-paper px-4 py-3 text-left transition-colors hover:bg-tinted"
                    style={{
                      borderLeft: `4px solid ${copy.tint}`,
                    }}
                  >
                    <span
                      className="flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{ backgroundColor: copy.tint }}
                      aria-hidden
                    >
                      {score}
                    </span>
                    <span
                      className="flex-1 text-base font-semibold"
                      style={{ color: "var(--ink-primary)" }}
                    >
                      {copy.title}
                    </span>
                    <span
                      aria-hidden
                      className="text-sm text-ink-muted transition-transform"
                      style={{
                        transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                      }}
                    >
                      ›
                    </span>
                  </button>
                  {isOpen && (
                    <PillarDetail
                      id={`pillar-${pillar}-panel`}
                      pillar={pillar}
                      breakdown={breakdown}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function PillarDetail({
  id,
  pillar,
  breakdown,
}: {
  id: string;
  pillar: PillarSlug;
  breakdown: PillarBreakdown | undefined;
}) {
  const tint = PILLAR_COPY[pillar].tint;
  const hasData =
    breakdown &&
    (breakdown.contributors.length > 0 || breakdown.recent.length > 0);

  return (
    <div
      id={id}
      className="mt-2 flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-sm"
      style={{
        borderTop: `2px solid color-mix(in srgb, ${tint} 35%, transparent)`,
      }}
    >
      {!hasData && (
        <p className="text-sm text-ink-secondary">
          No approved {PILLAR_COPY[pillar].title.toLowerCase()} quests in the
          last 4 weeks. Open a kid&apos;s quests to add one tonight.
        </p>
      )}

      {breakdown && breakdown.contributors.length > 0 && (
        <section className="flex flex-col gap-2">
          <h4 className="text-xs font-bold tracking-widest text-ink-muted uppercase">
            Contributors
          </h4>
          <ul className="flex flex-col gap-1.5">
            {breakdown.contributors.map((k) => (
              <li
                key={k.childId}
                className="flex items-center justify-between gap-3"
              >
                <Link
                  href={`/kids/${k.childId}`}
                  className="flex flex-1 items-center gap-2 rounded-md py-1 text-sm font-medium text-ink-primary transition-colors hover:text-brand-600"
                >
                  <span aria-hidden className="text-base">
                    {k.avatar}
                  </span>
                  <span>{k.name}</span>
                </Link>
                <span className="text-xs font-semibold text-ink-muted">
                  {k.approvedCount} quest{k.approvedCount === 1 ? "" : "s"} ·{" "}
                  <span style={{ color: tint }}>+{k.xp} XP</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {breakdown && breakdown.recent.length > 0 && (
        <section className="flex flex-col gap-2">
          <h4 className="text-xs font-bold tracking-widest text-ink-muted uppercase">
            Recently approved
          </h4>
          <ul className="flex flex-col gap-1">
            {breakdown.recent.map((q, i) => (
              <li
                key={i}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="flex-1 text-ink-primary">
                  &ldquo;{q.title}&rdquo;
                </span>
                <span className="shrink-0 text-xs text-ink-muted">
                  {q.childName} · +{q.xpReward}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
