import type { PillarSlug } from "@/lib/types/pillar";
import { PILLAR_COPY } from "@/lib/pillars/copy";
import { level } from "@/lib/growth/level";
import { DisplayRealtime } from "./DisplayRealtime";
import { LiveClock } from "./LiveClock";
import { RecentWinsTicker } from "./RecentWinsTicker";

export type KidView = {
  childId: string;
  name: string;
  avatar: string;
  totalXp: number;
  todayDone: number;
  todayTotal: number;
  todayPillars: PillarSlug[];
  todayPillarsDone: boolean[];
  streak: number;
};

export type Win = {
  id: number;
  childName: string;
  childAvatar: string;
  questTitle: string;
  pillar: PillarSlug;
  xp: number;
  approvedAt: string;
};

export function HouseholdLeaderboard({
  householdId,
  householdName,
  focusPillars,
  kids,
  wins,
  displayLabel,
}: {
  householdId: string;
  householdName: string;
  focusPillars: PillarSlug[];
  kids: KidView[];
  wins: Win[];
  displayLabel: string | null;
}) {
  const gridCols =
    kids.length === 1
      ? "grid-cols-1"
      : kids.length === 2
        ? "grid-cols-1 lg:grid-cols-2"
        : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3";

  return (
    <main
      className="flex h-dvh w-dvw flex-col overflow-hidden bg-paper text-ink-primary"
      style={{
        background:
          "radial-gradient(140% 80% at 50% 0%, color-mix(in srgb, var(--brand-500) 8%, var(--surface-paper)) 0%, var(--surface-paper) 50%)",
      }}
    >
      <DisplayRealtime householdId={householdId} kids={kids} />

      {/* ---- Top banner ---- */}
      <header className="flex items-end justify-between px-8 pt-6 pb-2 sm:px-12 lg:px-16">
        <div className="flex flex-col">
          <p className="text-[clamp(11px,1.2vw,16px)] font-medium tracking-[0.2em] text-ink-muted uppercase">
            The {householdName.replace(/^the\s+/i, "")}
          </p>
          <h1
            className="font-display text-[clamp(36px,5vw,72px)] leading-none"
            style={{
              fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif",
              letterSpacing: "-0.02em",
            }}
          >
            {householdName}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            {focusPillars.map((p) => (
              <span
                key={p}
                className="rounded-full px-3 py-1 text-[clamp(11px,1vw,14px)] font-bold tracking-wide text-white uppercase"
                style={{ backgroundColor: PILLAR_COPY[p].tint }}
              >
                {PILLAR_COPY[p].title}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-end text-right">
          <LiveClock />
          {displayLabel && (
            <p className="mt-1 text-[clamp(10px,0.9vw,13px)] font-medium tracking-widest text-ink-muted uppercase">
              {displayLabel}
            </p>
          )}
        </div>
      </header>

      {/* ---- Hero: kid cards ---- */}
      <section
        className={`grid flex-1 gap-4 px-6 py-4 sm:px-10 lg:gap-6 lg:px-16 ${gridCols}`}
      >
        {kids.map((k) => (
          <KidScoreboardCard key={k.childId} kid={k} />
        ))}
      </section>

      {/* ---- Ticker ---- */}
      <RecentWinsTicker wins={wins} />
    </main>
  );
}

function KidScoreboardCard({ kid }: { kid: KidView }) {
  const lvl = level(kid.totalXp);
  const xpInLevel = kid.totalXp % 100;
  const allDone = kid.todayTotal > 0 && kid.todayDone === kid.todayTotal;

  // Visual "champion glow" if all of today is done.
  const cardBg = allDone
    ? "color-mix(in srgb, var(--brand-500) 12%, var(--surface-card))"
    : "var(--surface-card)";

  return (
    <article
      className="relative flex flex-col items-center justify-between gap-3 rounded-3xl p-5 shadow-lg lg:p-7"
      style={{
        backgroundColor: cardBg,
        boxShadow:
          "0 10px 30px -10px rgba(31, 27, 22, 0.18), 0 2px 8px rgba(31, 27, 22, 0.06)",
      }}
    >
      {/* Avatar + level badge */}
      <div className="relative">
        <div
          className="flex items-center justify-center rounded-full bg-tinted"
          style={{
            width: "clamp(120px, 16vw, 240px)",
            height: "clamp(120px, 16vw, 240px)",
            fontSize: "clamp(72px, 10vw, 144px)",
            lineHeight: 1,
          }}
          aria-hidden
        >
          {kid.avatar}
        </div>
        <span
          className="absolute -right-3 -bottom-3 flex items-center justify-center rounded-full bg-brand-500 px-4 py-2 font-bold text-white shadow-md"
          style={{
            fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif",
            fontSize: "clamp(20px, 2.6vw, 36px)",
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          Lvl {lvl}
        </span>
      </div>

      {/* Name + streak */}
      <div className="flex items-center gap-3">
        <h2
          className="font-display"
          style={{
            fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif",
            fontSize: "clamp(28px, 3.6vw, 56px)",
            lineHeight: 1,
            letterSpacing: "-0.015em",
          }}
        >
          {kid.name}
        </h2>
        {kid.streak >= 3 && (
          <span
            className="flex items-center gap-1 rounded-full bg-warning/15 px-3 py-1 font-bold"
            style={{
              color: "var(--warning)",
              fontSize: "clamp(14px, 1.4vw, 20px)",
            }}
            aria-label={`${kid.streak}-day streak`}
          >
            <span aria-hidden>🔥</span>
            {kid.streak}
          </span>
        )}
      </div>

      {/* XP bar */}
      <div className="w-full max-w-md">
        <div className="mb-1.5 flex items-center justify-between">
          <span
            className="font-bold text-ink-secondary"
            style={{ fontSize: "clamp(12px, 1.1vw, 16px)" }}
          >
            {xpInLevel} / 100 XP
          </span>
          <span
            className="font-bold text-ink-muted"
            style={{ fontSize: "clamp(12px, 1.1vw, 16px)" }}
          >
            Lvl {lvl + 1} →
          </span>
        </div>
        <div
          className="overflow-hidden rounded-full bg-tinted"
          style={{ height: "clamp(14px, 1.6vw, 22px)" }}
        >
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-1000"
            style={{ width: `${xpInLevel}%` }}
          />
        </div>
      </div>

      {/* Today's quest slots */}
      <div className="flex flex-col items-center gap-2">
        <p
          className="font-bold text-ink-secondary"
          style={{ fontSize: "clamp(12px, 1.1vw, 16px)" }}
        >
          {kid.todayTotal === 0
            ? "No quests for today"
            : allDone
              ? `🎉 ${kid.todayTotal} for ${kid.todayTotal} today`
              : `${kid.todayDone} of ${kid.todayTotal} today`}
        </p>
        {kid.todayTotal > 0 && (
          <div className="flex gap-2">
            {kid.todayPillars.map((pillar, i) => {
              const done = kid.todayPillarsDone[i] ?? false;
              return (
                <span
                  key={i}
                  aria-label={`${PILLAR_COPY[pillar].title} ${done ? "done" : "to do"}`}
                  className="rounded-full transition-all"
                  style={{
                    width: "clamp(16px, 1.8vw, 26px)",
                    height: "clamp(16px, 1.8vw, 26px)",
                    backgroundColor: done
                      ? PILLAR_COPY[pillar].tint
                      : "color-mix(in srgb, var(--ink-muted) 25%, transparent)",
                    boxShadow: done
                      ? `0 0 0 3px color-mix(in srgb, ${PILLAR_COPY[pillar].tint} 25%, transparent)`
                      : undefined,
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </article>
  );
}
