// Family Growth Score per pillar, on the trailing 28 days.
//
// Formula (docs/ARCHITECTURE.md §4.2):
//   per-child score = round(70 * completion_rate + 30 * consistency)
//
// where (per child):
//   completion_rate = approved_completions_in_pillar / expected_completions_in_pillar
//                     (capped at 1.0)
//   consistency     = days_in_28_with_at_least_one_completion_in_pillar / 28
//
// expected per focus pillar (per child) = (3 daily slots / kid_focus_pillar_count) * 28 days
//
// Family score per pillar = average of per-child scores across children
// who include that pillar in their own focus_pillars. Pillars no kid
// focuses on return null (UI greys them).
//
// 2026-06-23: refactor from household-level focus_pillars to per-child.

import { PILLARS, type PillarSlug } from "@/lib/types/pillar";

export type ApprovedCompletion = {
  pillar: PillarSlug;
  approvedAt: Date | string;
};

export type ChildScoreInput = {
  childId: string;
  focusPillars: readonly PillarSlug[];
  completions: readonly ApprovedCompletion[];
};

export type FamilyScoreInput = {
  children: readonly ChildScoreInput[];
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

/** Per-child score for each of their own focus pillars (null otherwise). */
export function scoreChildByPillar(
  child: ChildScoreInput,
  asOf: Date = new Date(),
): Record<PillarSlug, number | null> {
  const focusSet = new Set<PillarSlug>(child.focusPillars);
  const result: Partial<Record<PillarSlug, number | null>> = {};

  const recent = child.completions.filter(
    (c) => daysAgo(c.approvedAt, asOf) < WINDOW_DAYS,
  );
  const byPillar = new Map<PillarSlug, ApprovedCompletion[]>();
  for (const c of recent) {
    const arr = byPillar.get(c.pillar) ?? [];
    arr.push(c);
    byPillar.set(c.pillar, arr);
  }

  const focusCount = child.focusPillars.length || 1;
  const expectedPerPillar = Math.max(
    1,
    Math.round((3 / focusCount) * WINDOW_DAYS),
  );

  for (const pillar of PILLARS) {
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

/** Family score per pillar = average across kids who include that pillar. */
export function familyScoreByPillar(
  input: FamilyScoreInput,
): Record<PillarSlug, number | null> {
  const asOf = input.asOf ?? new Date();
  const accum: Partial<Record<PillarSlug, { sum: number; n: number }>> = {};
  for (const child of input.children) {
    const cs = scoreChildByPillar(child, asOf);
    for (const pillar of PILLARS) {
      const v = cs[pillar];
      if (v == null) continue;
      const cell = accum[pillar] ?? { sum: 0, n: 0 };
      cell.sum += v;
      cell.n += 1;
      accum[pillar] = cell;
    }
  }
  const out: Partial<Record<PillarSlug, number | null>> = {};
  for (const pillar of PILLARS) {
    const cell = accum[pillar];
    out[pillar] = cell ? Math.round(cell.sum / cell.n) : null;
  }
  return out as Record<PillarSlug, number | null>;
}

// ----- Legacy adapter -------------------------------------------------------
// `scoreByPillar` was the household-level entrypoint. Some callsites still
// hold a single household-wide focusPillars list (display surface, share
// card pre-refactor). Adapt by treating the household as a single virtual
// child for backwards compatibility. New code should call familyScoreByPillar.

export type ScoreInput = {
  focusPillars: readonly PillarSlug[];
  childrenCount: number;
  completions: readonly ApprovedCompletion[];
  asOf?: Date;
};

export function scoreByPillar(
  input: ScoreInput,
): Record<PillarSlug, number | null> {
  return scoreChildByPillar(
    {
      childId: "household",
      focusPillars: input.focusPillars,
      completions: input.completions,
    },
    input.asOf ?? new Date(),
  );
}
