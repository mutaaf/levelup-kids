// Rule-based quest selector — seeds the first 7 days of daily quests for
// every child in a household, based on the household's focus pillars.
//
// Rules (MVP simplification of ticket 0009):
//   1. Each focus pillar appears in at least 1 of the 3 daily slots every day.
//   2. The 3rd slot rotates through the focus pillars (round-robin per day).
//   3. No template repeats within the same 7-day window for the same child.
//   4. All templates are difficulty 1, 5 XP each (per the seed library).

import {
  SEED_LIBRARY,
  templatesForPillar,
  type QuestTemplate,
} from "@/lib/quests/seed-library";
import type { PillarSlug } from "@/lib/types/pillar";

export type SeedQuestRow = {
  child_id: string;
  title: string;
  description: string;
  pillar: PillarSlug;
  type: "daily";
  difficulty: number;
  xp_reward: number;
  assigned_for: string; // YYYY-MM-DD
};

const DAYS = 7;

/** Format a Date as YYYY-MM-DD in the local tz of the runtime. */
function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Add N days to a date and return a new Date. */
function plusDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/**
 * Pick a template for `pillar` that hasn't been used yet for this child this
 * week. Falls back to the earliest template if every option has been used
 * (only happens when pillar's pool is exhausted within the 7-day window).
 */
function pickTemplate(
  pillar: PillarSlug,
  used: ReadonlySet<string>,
  rng: () => number,
): QuestTemplate {
  const pool = templatesForPillar(pillar);
  const fresh = pool.filter((t) => !used.has(t.title));
  const choices = fresh.length > 0 ? fresh : pool;
  const i = Math.floor(rng() * choices.length);
  return choices[i] ?? choices[0]!;
}

/** Produce the 21-row daily quest plan for a single child. */
export function seedQuestsForChild(args: {
  childId: string;
  focusPillars: readonly PillarSlug[];
  weekStart?: Date;
  rng?: () => number;
}): SeedQuestRow[] {
  const { childId } = args;
  const pillars = args.focusPillars;
  if (pillars.length === 0) return [];
  const start = args.weekStart ?? new Date();
  const rng = args.rng ?? Math.random;

  const used = new Set<string>();
  const rows: SeedQuestRow[] = [];

  for (let day = 0; day < DAYS; day++) {
    const date = isoDate(plusDays(start, day));
    // Slot pattern: first pillars.length slots cover every focus pillar once.
    // If pillars.length < 3, the remaining slots rotate round-robin.
    const slotPillars: PillarSlug[] = [];
    for (let i = 0; i < 3; i++) {
      slotPillars.push(pillars[(day + i) % pillars.length]!);
    }
    for (const pillar of slotPillars) {
      const tpl = pickTemplate(pillar, used, rng);
      used.add(tpl.title);
      rows.push({
        child_id: childId,
        title: tpl.title,
        description: tpl.description,
        pillar,
        type: "daily",
        difficulty: tpl.difficulty,
        xp_reward: tpl.xpReward,
        assigned_for: date,
      });
    }
  }

  return rows;
}

/** Seed a full household — all children at once. Returns one flat array. */
export function seedFirstWeek(args: {
  children: readonly { id: string }[];
  focusPillars: readonly PillarSlug[];
  weekStart?: Date;
  rng?: () => number;
}): SeedQuestRow[] {
  return args.children.flatMap((c) =>
    seedQuestsForChild({
      childId: c.id,
      focusPillars: args.focusPillars,
      weekStart: args.weekStart,
      rng: args.rng,
    }),
  );
}

// re-export for callers that want the library directly
export { SEED_LIBRARY };
