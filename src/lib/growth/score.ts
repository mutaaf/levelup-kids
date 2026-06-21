// Family Growth Score per pillar, on the trailing 28 days.
//
// Formula (docs/ARCHITECTURE.md §4.2):
//   score = round(70 * completion_rate + 30 * consistency)
//
// where:
//   completion_rate = approved_completions_in_pillar / expected_completions_in_pillar
//                     (capped at 1.0)
//   consistency     = days_in_28_with_at_least_one_completion_in_pillar / 28
//
// expected per focus pillar = (3 daily slots / focus_pillar_count) * 28 days * child_count
// non-focus pillars return null (UI greys them).

import type { PillarSlug } from "@/lib/types/pillar";

export type ApprovedCompletion = {
  pillar: PillarSlug;
  approvedAt: Date | string;
};

export type ScoreInput = {
  focusPillars: readonly PillarSlug[];
  childrenCount: number;
  completions: readonly ApprovedCompletion[];
  asOf?: Date;
};

const WINDOW_DAYS = 28;

function dayKey(d: Date | string): string {
  const date = d instanceof Date ? d : new Date(d);
  return date.toISOString().slice(0, 10);
}

function daysAgo(d: Date | string, asOf: Date): number {
  const date = d instanceof Date ? d : new Date(d);
  return Math.floor((asOf.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

/** Returns the score per pillar (or null for non-focus pillars). */
export function scoreByPillar(
  input: ScoreInput,
): Record<PillarSlug, number | null> {
  const asOf = input.asOf ?? new Date();
  const focusSet = new Set<PillarSlug>(input.focusPillars);
  const result: Partial<Record<PillarSlug, number | null>> = {};

  // Group recent completions by pillar.
  const recent = input.completions.filter(
    (c) => daysAgo(c.approvedAt, asOf) < WINDOW_DAYS,
  );
  const byPillar = new Map<PillarSlug, ApprovedCompletion[]>();
  for (const c of recent) {
    const arr = byPillar.get(c.pillar) ?? [];
    arr.push(c);
    byPillar.set(c.pillar, arr);
  }

  const focusCount = input.focusPillars.length || 1;
  const expectedPerPillar = Math.max(
    1,
    Math.round(((3 / focusCount) * WINDOW_DAYS) * Math.max(1, input.childrenCount)),
  );

  for (const pillar of [
    "scholar",
    "athlete",
    "builder",
    "creator",
    "leader",
    "character",
    "explorer",
    "purpose",
  ] as PillarSlug[]) {
    if (!focusSet.has(pillar)) {
      result[pillar] = null;
      continue;
    }
    const list = byPillar.get(pillar) ?? [];
    const completion = Math.min(1, list.length / expectedPerPillar);
    const days = new Set(list.map((c) => dayKey(c.approvedAt)));
    const consistency = days.size / WINDOW_DAYS;
    result[pillar] = Math.round(70 * completion + 30 * consistency);
  }

  return result as Record<PillarSlug, number | null>;
}
