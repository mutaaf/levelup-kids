"use client";

import { useEffect, useState } from "react";

export function LiveClock() {
  // Render an empty placeholder server-side to avoid hydration drift.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  if (!now) {
    return (
      <div
        className="font-mono text-ink-muted"
        style={{ fontSize: "clamp(14px, 1.4vw, 22px)" }}
      >
        &nbsp;
      </div>
    );
  }

  const time = now.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  const day = now.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col items-end gap-0.5">
      <span
        className="font-display font-bold text-ink-primary tabular-nums"
        style={{
          fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif",
          fontSize: "clamp(20px, 2.4vw, 36px)",
          lineHeight: 1,
          letterSpacing: "-0.01em",
        }}
      >
        {time}
      </span>
      <span
        className="text-ink-secondary"
        style={{ fontSize: "clamp(11px, 1.1vw, 16px)" }}
      >
        {day}
      </span>
    </div>
  );
}
