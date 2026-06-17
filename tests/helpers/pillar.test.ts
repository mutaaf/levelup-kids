// Ticket 0002 AC: `pillarSlugSchema` validates each of the 8 pillars and
// rejects unknowns. `pillars` is intentionally a TypeScript enum (not a DB
// table) — the source of truth at runtime is `src/lib/types/pillar.ts`; the
// DB enforces the same set via a CHECK constraint on every `pillar` column.
//
// (We use a zod-shaped local schema rather than importing `zod` itself — the
// ticket's engineering note explicitly forbids new top-level deps. The schema
// surface is `.safeParse() / .parse()` so a v1.1 swap to real zod is a
// drop-in replacement when zod arrives via a future ticket.)

import { describe, expect, it } from "vitest";
import { PILLARS, pillarSlugSchema, type PillarSlug } from "@/lib/types/pillar";

describe("pillarSlugSchema", () => {
  it("exports the 8 pillars in the documented order", () => {
    expect(PILLARS).toEqual([
      "scholar",
      "athlete",
      "builder",
      "creator",
      "leader",
      "character",
      "explorer",
      "purpose",
    ]);
  });

  it("accepts each of the 8 pillars", () => {
    for (const p of PILLARS) {
      const r = pillarSlugSchema.safeParse(p);
      expect(r.success, `pillar ${p} should validate`).toBe(true);
      if (r.success) {
        const _typecheck: PillarSlug = r.data; // compile-time narrowing
        void _typecheck;
      }
    }
  });

  it("rejects unknown pillar slugs", () => {
    for (const bad of ["wizardry", "", "Scholar", "athlete ", null, 42, undefined]) {
      const r = pillarSlugSchema.safeParse(bad);
      expect(r.success, `value ${JSON.stringify(bad)} should be rejected`).toBe(false);
    }
  });

  it("parse() throws on invalid input and returns the value on valid input", () => {
    expect(() => pillarSlugSchema.parse("wizardry")).toThrow();
    expect(pillarSlugSchema.parse("scholar")).toBe("scholar");
  });
});
