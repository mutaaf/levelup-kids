// Pillars — the eight axes of the Family Growth Score.
//
// IMPORTANT: `pillars` is a TypeScript enum, NOT a database table. Per
// ticket 0002 + docs/ARCHITECTURE.md §3, every `pillar` column in Postgres
// uses a CHECK constraint listing these same 8 slugs. Adding a 9th pillar
// is a discussion (new ticket), not a unilateral change — it requires a
// migration here AND in `supabase/migrations/`, plus design copy.
//
// Order is canonical (mirrored by the radar chart axis order in
// `src/components/growth/FamilyGrowthRadar.tsx`). Don't re-order.

export const PILLARS = [
  "scholar",
  "athlete",
  "builder",
  "creator",
  "leader",
  "character",
  "explorer",
  "purpose",
] as const;

export type PillarSlug = (typeof PILLARS)[number];

const PILLAR_SET: ReadonlySet<string> = new Set(PILLARS);

export interface PillarParseSuccess {
  readonly success: true;
  readonly data: PillarSlug;
}
export interface PillarParseFailure {
  readonly success: false;
  readonly error: { readonly message: string };
}
export type PillarParseResult = PillarParseSuccess | PillarParseFailure;

/** A zod-shaped schema for pillar slugs. Surface intentionally matches the
 *  zod `ZodSchema` API (`.safeParse() / .parse()`) so a future ticket that
 *  introduces zod as a dependency can swap this for `z.enum(PILLARS)` with
 *  zero call-site changes. */
export const pillarSlugSchema = {
  safeParse(value: unknown): PillarParseResult {
    if (typeof value === "string" && PILLAR_SET.has(value)) {
      return { success: true, data: value as PillarSlug };
    }
    return {
      success: false,
      error: {
        message: `Invalid pillar slug: ${JSON.stringify(value)}. Expected one of ${PILLARS.join(", ")}.`,
      },
    };
  },
  parse(value: unknown): PillarSlug {
    const r = this.safeParse(value);
    if (!r.success) throw new Error(r.error.message);
    return r.data;
  },
} as const;

export function isPillarSlug(value: unknown): value is PillarSlug {
  return typeof value === "string" && PILLAR_SET.has(value);
}
