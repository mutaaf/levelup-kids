// The starter achievement set. Six badges, hand-tuned thresholds, each
// pointing at a clear visible behavior. Definitions live in TS (versioned,
// reviewable) and earnings live in DB (table: child_achievements).
//
// Adding a new badge later:
//   1. Append to BADGES with a unique id and a check() that takes the
//      per-child stats snapshot.
//   2. Done. The awarder runs every badge on every approval; ones already
//      earned are skipped via the unique(child_id, badge_id) constraint.

import type { PillarSlug } from "@/lib/types/pillar";

export type ChildStatsSnapshot = {
  totalXp: number;
  level: number;
  streakDays: number;
  approvedByPillar: Record<PillarSlug, number>;
  /** Number of distinct days within the trailing 28 where ≥1 quest was
   *  approved for THIS pillar. Useful for "X in 28 days" badges. */
  pillarDaysIn28: Record<PillarSlug, number>;
  /** Family Growth Score, max across pillars in focus, 0-100. */
  familyMaxScore: number;
};

export type Badge = {
  id: string;
  title: string;
  description: string;
  pillar: PillarSlug | "any";
  emoji: string;
  /** Returns true if the child has earned this badge based on current stats. */
  check: (s: ChildStatsSnapshot) => boolean;
};

export const BADGES: readonly Badge[] = [
  {
    id: "steady-reader",
    title: "Steady Reader",
    description: "Approved a Scholar quest 7 different days this month.",
    pillar: "scholar",
    emoji: "📖",
    check: (s) => s.pillarDaysIn28.scholar >= 7,
  },
  {
    id: "strong-body",
    title: "Strong Body",
    description: "Approved 14 Athlete quests in the last 28 days.",
    pillar: "athlete",
    emoji: "💪",
    check: (s) => s.approvedByPillar.athlete >= 14,
  },
  {
    id: "maker",
    title: "Maker",
    description: "Approved any 5 Builder or Creator quests.",
    pillar: "any",
    emoji: "🛠️",
    check: (s) =>
      s.approvedByPillar.builder + s.approvedByPillar.creator >= 5,
  },
  {
    id: "servant-leader",
    title: "Servant Leader",
    description: "Approved 5 Purpose quests.",
    pillar: "purpose",
    emoji: "🙌",
    check: (s) => s.approvedByPillar.purpose >= 5,
  },
  {
    id: "climber",
    title: "Climber",
    description: "Reached Level 5.",
    pillar: "any",
    emoji: "🧗",
    check: (s) => s.level >= 5,
  },
  {
    id: "family-champion",
    title: "Family Champion",
    description: "Helped your household hit a Growth Score of 80+.",
    pillar: "any",
    emoji: "🏆",
    check: (s) => s.familyMaxScore >= 80,
  },
] as const;

export function badgeById(id: string): Badge | undefined {
  return BADGES.find((b) => b.id === id);
}
