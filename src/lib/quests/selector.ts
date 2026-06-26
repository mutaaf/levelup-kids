// Rule-based quest selector. Seeds 7 days × 3 daily quests per child, picking
// from BOTH the global SEED_LIBRARY (src/lib/quests/seed-library.ts) and the
// household's custom quests (DB table: household_quests), filtered by each
// child's age.

import {
  SEED_LIBRARY,
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

/** A household custom quest, shaped to match the QuestTemplate interface
 *  so the picker can treat it identically. */
export type CustomQuestTemplate = QuestTemplate;

const DAYS = 7;

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function plusDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/**
 * Combine + age-filter both the global library and the household's custom
 * quests, then pick a template for the given pillar that hasn't been used
 * yet this week for this child.
 */
function pickTemplate(args: {
  pillar: PillarSlug;
  age: number;
  used: ReadonlySet<string>;
  rng: () => number;
  customTemplates: readonly CustomQuestTemplate[];
}): QuestTemplate {
  const all: QuestTemplate[] = [
    ...SEED_LIBRARY,
    ...args.customTemplates,
  ].filter(
    (t) =>
      t.pillar === args.pillar &&
      args.age >= t.ageMin &&
      args.age <= t.ageMax,
  );
  const fresh = all.filter((t) => !args.used.has(t.title));
  const pool = fresh.length > 0 ? fresh : all;
  if (pool.length === 0) {
    // No templates at all for this pillar+age. Fall back to the most generic
    // global template for the pillar (regardless of age).
    return SEED_LIBRARY.find((t) => t.pillar === args.pillar) ?? SEED_LIBRARY[0]!;
  }
  const i = Math.floor(args.rng() * pool.length);
  return pool[i] ?? pool[0]!;
}

/** Produce the 21-row daily quest plan for a single child. */
export function seedQuestsForChild(args: {
  childId: string;
  age: number;
  focusPillars: readonly PillarSlug[];
  customTemplates?: readonly CustomQuestTemplate[];
  weekStart?: Date;
  rng?: () => number;
}): SeedQuestRow[] {
  const { childId, age } = args;
  const pillars = args.focusPillars;
  if (pillars.length === 0) return [];
  const start = args.weekStart ?? new Date();
  const rng = args.rng ?? Math.random;
  const customTemplates = args.customTemplates ?? [];

  const used = new Set<string>();
  const rows: SeedQuestRow[] = [];

  for (let day = 0; day < DAYS; day++) {
    const date = isoDate(plusDays(start, day));
    // First N slots cover every focus pillar once (where N = pillar count
    // up to 3). The remaining slots round-robin.
    const slotPillars: PillarSlug[] = [];
    for (let i = 0; i < 3; i++) {
      slotPillars.push(pillars[(day + i) % pillars.length]!);
    }
    for (const pillar of slotPillars) {
      const tpl = pickTemplate({
        pillar,
        age,
        used,
        rng,
        customTemplates,
      });
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
  children: readonly { id: string; age: number }[];
  focusPillars: readonly PillarSlug[];
  customTemplates?: readonly CustomQuestTemplate[];
  weekStart?: Date;
  rng?: () => number;
}): SeedQuestRow[] {
  return args.children.flatMap((c) =>
    seedQuestsForChild({
      childId: c.id,
      age: c.age,
      focusPillars: args.focusPillars,
      customTemplates: args.customTemplates,
      weekStart: args.weekStart,
      rng: args.rng,
    }),
  );
}

export { SEED_LIBRARY };
