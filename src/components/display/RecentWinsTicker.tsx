"use client";

import { useEffect, useState } from "react";
import type { Win } from "./HouseholdLeaderboard";
import { PILLAR_COPY } from "@/lib/pillars/copy";

function ago(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function RecentWinsTicker({ wins }: { wins: Win[] }) {
  // Re-render every 30s so the "Xm ago" text stays fresh without a refetch.
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  if (wins.length === 0) {
    return (
      <footer
        className="flex items-center justify-center bg-card/60 px-8 py-4 text-ink-muted"
        style={{ fontSize: "clamp(14px, 1.4vw, 20px)" }}
      >
        First win of the day is one quest away.
      </footer>
    );
  }

  return (
    <footer
      className="relative overflow-hidden border-t border-ink-muted/15 bg-card/80"
      style={{ minHeight: "clamp(54px, 6vh, 80px)" }}
    >
      <div className="flex animate-[ticker_45s_linear_infinite] gap-12 px-8 py-3 whitespace-nowrap will-change-transform">
        {[...wins, ...wins].map((w, i) => (
          <span
            key={`${w.id}-${i}`}
            className="flex items-center gap-3"
            style={{ fontSize: "clamp(15px, 1.6vw, 24px)" }}
          >
            <span aria-hidden className="text-[1.2em]">
              {w.childAvatar}
            </span>
            <span className="font-bold">{w.childName}</span>
            <span className="text-ink-secondary">finished</span>
            <span className="font-medium">{w.questTitle}</span>
            <span
              className="rounded-full px-2.5 py-0.5 font-bold text-white"
              style={{
                backgroundColor: PILLAR_COPY[w.pillar].tint,
                fontSize: "0.75em",
              }}
            >
              +{w.xp} XP
            </span>
            <span className="text-ink-muted">{ago(w.approvedAt)}</span>
          </span>
        ))}
      </div>
    </footer>
  );
}
