import { describe, expect, it } from "vitest";
import { level } from "@/lib/growth/level";

// Acceptance criterion (ticket 0001):
// "one smoke test included that asserts level(0) === 0 and level(550) === 5"
// Per src/lib/growth/level.ts the v1.0 formula is Math.floor(totalXp / 100).
describe("level()", () => {
  it("returns 0 for 0 XP", () => {
    expect(level(0)).toBe(0);
  });

  it("returns 5 for 550 XP (floor(550/100))", () => {
    expect(level(550)).toBe(5);
  });
});
