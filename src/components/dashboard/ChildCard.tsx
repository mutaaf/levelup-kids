import Link from "next/link";
import { level } from "@/lib/growth/level";

export type ChildCardProps = {
  childId: string;
  name: string;
  avatar: string;
  totalXp: number;
  todayDone: number;
  todayTotal: number;
};

export function ChildCard({
  childId,
  name,
  avatar,
  totalXp,
  todayDone,
  todayTotal,
}: ChildCardProps) {
  const lvl = level(totalXp);
  const xpInLevel = totalXp % 100;
  return (
    <Link
      href={`/kids/${childId}`}
      className="group flex items-center gap-4 rounded-lg bg-card p-5 shadow-sm transition hover:shadow-md"
    >
      <div
        className="relative flex size-16 items-center justify-center rounded-full bg-tinted text-3xl"
        aria-hidden
      >
        {avatar}
        <span
          className="absolute -right-1 -bottom-1 rounded-full bg-brand-500 px-1.5 py-0.5 text-xs font-bold text-white"
          aria-label={`Level ${lvl}`}
        >
          {lvl}
        </span>
      </div>
      <div className="flex-1">
        <h3 className="font-display text-lg" style={{ fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif" }}>
          {name}
        </h3>
        <div className="mt-1 flex items-center gap-3 text-sm text-ink-secondary">
          <span>
            Level {lvl} · {xpInLevel}/100 XP
          </span>
          <span aria-hidden>·</span>
          <span>
            {todayDone}/{todayTotal} today
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-tinted">
          <div
            className="h-full bg-brand-500 transition-all"
            style={{ width: `${(xpInLevel / 100) * 100}%` }}
          />
        </div>
      </div>
      <span
        aria-hidden
        className="text-2xl text-ink-muted transition group-hover:translate-x-0.5 group-hover:text-brand-500"
      >
        →
      </span>
    </Link>
  );
}
