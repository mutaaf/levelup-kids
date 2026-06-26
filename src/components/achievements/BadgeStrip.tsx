import { BADGES } from "@/lib/achievements/badges";

export type EarnedBadge = {
  badgeId: string;
  earnedAt: string;
};

export function BadgeStrip({ earned }: { earned: EarnedBadge[] }) {
  if (earned.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-3xl bg-card p-6 text-center shadow-md">
        <span className="text-3xl" aria-hidden>
          🏅
        </span>
        <p className="text-base font-medium text-ink-secondary">
          Your first badge is coming. Keep completing quests.
        </p>
      </div>
    );
  }

  const sorted = [...earned].sort(
    (a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime(),
  );

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {sorted.map((e) => {
        const def = BADGES.find((b) => b.id === e.badgeId);
        if (!def) return null;
        return (
          <div
            key={e.badgeId}
            className="flex min-w-[140px] flex-col items-center gap-1.5 rounded-2xl bg-card p-4 text-center shadow-md"
            title={def.description}
          >
            <span className="text-3xl" aria-hidden>
              {def.emoji}
            </span>
            <p
              className="font-display text-sm font-bold"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              {def.title}
            </p>
          </div>
        );
      })}
    </div>
  );
}
