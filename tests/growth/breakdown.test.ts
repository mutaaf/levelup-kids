import { describe, expect, it } from "vitest";
import { buildPillarBreakdowns } from "@/lib/growth/breakdown";
import type { CompletionForScore } from "@/lib/data/cached";

const KIDS = [
  { id: "z", name: "Zara", avatar: "🦊" },
  { id: "y", name: "Yusuf", avatar: "🐻" },
];

function comp(
  child: "z" | "y",
  pillar: CompletionForScore["pillar"],
  daysAgo: number,
  xp: number,
  title: string,
): CompletionForScore {
  const t = Date.now() - daysAgo * 24 * 60 * 60 * 1000;
  return {
    pillar,
    approvedAt: new Date(t).toISOString(),
    childId: child,
    xpAwarded: xp,
    questTitle: title,
  };
}

describe("buildPillarBreakdowns", () => {
  it("groups contributors by pillar and sorts by XP desc", () => {
    const breakdowns = buildPillarBreakdowns({
      children: KIDS,
      completions: [
        comp("z", "scholar", 1, 15, "Read for 20 min"),
        comp("z", "scholar", 2, 15, "Read for 20 min"),
        comp("y", "scholar", 1, 10, "Read for 10 min"),
      ],
    });
    const scholar = breakdowns.scholar;
    expect(scholar.contributors.map((c) => c.childId)).toEqual(["z", "y"]);
    expect(scholar.contributors[0]).toMatchObject({
      childId: "z",
      approvedCount: 2,
      xp: 30,
    });
    expect(scholar.contributors[1]).toMatchObject({
      childId: "y",
      approvedCount: 1,
      xp: 10,
    });
  });

  it("excludes completions older than the 28-day window", () => {
    const breakdowns = buildPillarBreakdowns({
      children: KIDS,
      completions: [
        comp("z", "athlete", 5, 15, "Recent"),
        comp("z", "athlete", 60, 15, "Way out of window"),
      ],
    });
    expect(breakdowns.athlete.contributors).toHaveLength(1);
    expect(breakdowns.athlete.contributors[0]?.approvedCount).toBe(1);
    expect(breakdowns.athlete.recent).toHaveLength(1);
    expect(breakdowns.athlete.recent[0]?.title).toBe("Recent");
  });

  it("caps recent quests at 5 newest first", () => {
    const completions: CompletionForScore[] = [];
    for (let i = 0; i < 8; i++) {
      completions.push(comp("z", "creator", i, 5, `Quest ${i}`));
    }
    const breakdowns = buildPillarBreakdowns({
      children: KIDS,
      completions,
    });
    expect(breakdowns.creator.recent).toHaveLength(5);
    expect(breakdowns.creator.recent.map((q) => q.title)).toEqual([
      "Quest 0",
      "Quest 1",
      "Quest 2",
      "Quest 3",
      "Quest 4",
    ]);
  });

  it("returns an empty bucket for pillars with no completions", () => {
    const breakdowns = buildPillarBreakdowns({
      children: KIDS,
      completions: [comp("z", "scholar", 1, 10, "Test")],
    });
    expect(breakdowns.purpose.contributors).toEqual([]);
    expect(breakdowns.purpose.recent).toEqual([]);
  });
});
