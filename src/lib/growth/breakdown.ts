import { PILLARS, type PillarSlug } from "@/lib/types/pillar";
import type { CompletionForScore } from "@/lib/data/cached";

// Per-pillar drill-in for the interactive radar. Given the household's
// kids + the cached approved completions (trailing 28 days are what
// the radar scores), build a per-pillar breakdown that powers the
// detail drawer when a parent taps a pillar.
//
// Pure function — easy to test, no DB access.

export type PillarContributorKid = {
  childId: string;
  name: string;
  avatar: string;
  approvedCount: number;
  xp: number;
};

export type PillarRecentQuest = {
  title: string;
  childName: string;
  xpReward: number;
  approvedAt: string;
};

export type PillarBreakdown = {
  pillar: PillarSlug;
  contributors: PillarContributorKid[]; // sorted by xp desc
  recent: PillarRecentQuest[]; // newest first, capped
};

const WINDOW_DAYS = 28;
const RECENT_CAP = 5;

export function buildPillarBreakdowns(args: {
  children: ReadonlyArray<{ id: string; name: string; avatar: string }>;
  completions: ReadonlyArray<CompletionForScore>;
  asOf?: Date;
}): Record<PillarSlug, PillarBreakdown> {
  const asOf = args.asOf ?? new Date();
  const windowStart = asOf.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const nameById = new Map(args.children.map((c) => [c.id, c.name]));
  const avatarById = new Map(args.children.map((c) => [c.id, c.avatar]));

  const out: Partial<Record<PillarSlug, PillarBreakdown>> = {};
  for (const pillar of PILLARS) {
    out[pillar] = { pillar, contributors: [], recent: [] };
  }

  // Group by pillar; only completions in the 28-day window matter.
  const recent = args.completions.filter(
    (c) => new Date(c.approvedAt).getTime() >= windowStart,
  );

  for (const c of recent) {
    const bucket = out[c.pillar];
    if (!bucket) continue;
    // Contributor stats.
    let kid = bucket.contributors.find((k) => k.childId === c.childId);
    if (!kid) {
      kid = {
        childId: c.childId,
        name: nameById.get(c.childId) ?? "",
        avatar: avatarById.get(c.childId) ?? "🦊",
        approvedCount: 0,
        xp: 0,
      };
      bucket.contributors.push(kid);
    }
    kid.approvedCount += 1;
    kid.xp += c.xpAwarded;
    // Recent quest entry — kept unsorted, sorted + capped at the end.
    bucket.recent.push({
      title: c.questTitle,
      childName: nameById.get(c.childId) ?? "",
      xpReward: c.xpAwarded,
      approvedAt: c.approvedAt,
    });
  }

  for (const pillar of PILLARS) {
    const b = out[pillar]!;
    b.contributors.sort((a, z) => z.xp - a.xp);
    b.recent.sort(
      (a, z) =>
        new Date(z.approvedAt).getTime() - new Date(a.approvedAt).getTime(),
    );
    b.recent = b.recent.slice(0, RECENT_CAP);
  }

  return out as Record<PillarSlug, PillarBreakdown>;
}
