import Link from "next/link";
import { level } from "@/lib/growth/level";

export type ChildCardProps = {
  childId: string;
  name: string;
  avatar: string;
  totalXp: number;
  todayDone: number;
  todayTotal: number;
  streakDays?: number;
  badgeCount?: number;
};

export function ChildCard({
  childId,
  name,
  avatar,
  totalXp,
  todayDone,
  todayTotal,
  streakDays = 0,
  badgeCount = 0,
}: ChildCardProps) {
  const lvl = level(totalXp);
  const xpInLevel = totalXp % 100;
  const allDone = todayTotal > 0 && todayDone === todayTotal;
  const noQuestsToday = todayTotal === 0;

  return (
    <Link
      href={`/kids/${childId}`}
      className="group flex flex-col gap-4 rounded-3xl bg-card p-5 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
      style={{
        background: allDone
          ? "color-mix(in srgb, var(--brand-500) 10%, var(--surface-card))"
          : "var(--surface-card)",
      }}
    >
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <div
            className="flex size-24 items-center justify-center rounded-full bg-paper text-5xl shadow-sm"
            style={{
              boxShadow: allDone
                ? "inset 0 0 0 4px color-mix(in srgb, var(--brand-500) 30%, transparent)"
                : "inset 0 0 0 3px color-mix(in srgb, var(--brand-500) 12%, transparent)",
            }}
            aria-hidden
          >
            {avatar}
          </div>
          <span
            className="absolute -right-1 -bottom-1 rounded-full bg-brand-500 px-2.5 py-1 text-sm font-bold text-white shadow-md"
            aria-label={`Level ${lvl}`}
            style={{
              fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif",
              letterSpacing: "-0.01em",
            }}
          >
            {lvl}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h3
            className="font-display"
            style={{
              fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif",
              fontSize: "1.5rem",
              lineHeight: 1.1,
              letterSpacing: "-0.015em",
            }}
          >
            {name}
          </h3>
          <p className="mt-1 text-base font-medium text-ink-secondary">
            {noQuestsToday
              ? "First quests tomorrow"
              : allDone
                ? `🎉 ${todayDone} for ${todayDone} today`
                : `${todayDone} of ${todayTotal} today`}
          </p>
          {(streakDays >= 3 || badgeCount > 0) && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {streakDays >= 3 && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold"
                  style={{
                    color: "var(--warning)",
                    backgroundColor:
                      "color-mix(in srgb, var(--warning) 15%, transparent)",
                  }}
                  aria-label={`${streakDays}-day streak`}
                >
                  <span aria-hidden>🔥</span>
                  {streakDays}d
                </span>
              )}
              {badgeCount > 0 && (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-600"
                  aria-label={`${badgeCount} badge${badgeCount === 1 ? "" : "s"} earned`}
                >
                  <span aria-hidden>🏅</span>
                  {badgeCount}
                </span>
              )}
            </div>
          )}
        </div>
        <span
          aria-hidden
          className="text-3xl text-ink-muted transition-all group-hover:translate-x-0.5 group-hover:text-brand-500"
        >
          →
        </span>
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between text-sm font-semibold">
          <span className="text-ink-secondary">
            {xpInLevel} <span className="text-ink-muted">/ 100 XP</span>
          </span>
          <span className="text-ink-muted">Lvl {lvl + 1} next</span>
        </div>
        <div
          className="overflow-hidden rounded-full bg-tinted"
          style={{ height: "12px" }}
        >
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-700"
            style={{ width: `${xpInLevel}%` }}
          />
        </div>
      </div>
    </Link>
  );
}
