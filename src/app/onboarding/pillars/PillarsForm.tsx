"use client";

import { useState, useTransition } from "react";
import { setFocusPillars } from "./actions";

type PillarCard = {
  slug: string;
  title: string;
  body: string;
  tint: string;
};

const MAX_FOCUS = 3;
const MIN_FOCUS = 2;

const PILLAR_EMOJI: Record<string, string> = {
  scholar: "📚",
  athlete: "⚽",
  builder: "🔨",
  creator: "🎨",
  leader: "🏅",
  character: "🌟",
  explorer: "🧭",
  purpose: "🤝",
};

export function PillarsForm({
  pillars,
  initial,
}: {
  pillars: PillarCard[];
  initial: string[];
}) {
  const [selected, setSelected] = useState<string[]>(initial.slice(0, MAX_FOCUS));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle(slug: string) {
    setSelected((cur) => {
      if (cur.includes(slug)) return cur.filter((s) => s !== slug);
      // FIFO replacement once we hit the cap.
      if (cur.length >= MAX_FOCUS) return [...cur.slice(1), slug];
      return [...cur, slug];
    });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (selected.length < MIN_FOCUS) {
      setError(`Pick at least ${MIN_FOCUS}.`);
      return;
    }
    startTransition(async () => {
      const result = await setFocusPillars(selected);
      if (result && !result.ok) setError(result.error);
    });
  }

  const remaining = MIN_FOCUS - selected.length;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {pillars.map((p) => {
          const isSelected = selected.includes(p.slug);
          return (
            <button
              key={p.slug}
              type="button"
              onClick={() => toggle(p.slug)}
              aria-pressed={isSelected}
              className="relative flex flex-col items-start gap-3 rounded-3xl p-5 text-left transition-all"
              style={{
                backgroundColor: isSelected
                  ? `color-mix(in srgb, ${p.tint} 12%, var(--surface-card))`
                  : "var(--surface-card)",
                boxShadow: isSelected
                  ? `0 0 0 3px ${p.tint}, 0 12px 32px -8px color-mix(in srgb, ${p.tint} 40%, transparent)`
                  : "0 4px 12px rgba(31, 27, 22, 0.06)",
                transform: isSelected ? "translateY(-2px)" : "none",
              }}
            >
              <div className="flex w-full items-center justify-between">
                <span
                  className="flex size-14 items-center justify-center rounded-2xl text-3xl"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${p.tint} 18%, var(--surface-paper))`,
                  }}
                  aria-hidden
                >
                  {PILLAR_EMOJI[p.slug] ?? "✨"}
                </span>
                {isSelected && (
                  <span
                    className="inline-flex size-7 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: p.tint }}
                    aria-hidden
                  >
                    ✓
                  </span>
                )}
              </div>
              <h2
                className="font-display"
                style={{
                  fontFamily:
                    "var(--font-fraunces), ui-serif, Georgia, serif",
                  fontSize: "1.5rem",
                  letterSpacing: "-0.015em",
                  color: isSelected ? p.tint : "var(--ink-primary)",
                }}
              >
                {p.title}
              </h2>
              <p className="text-base leading-snug text-ink-secondary">
                {p.body}
              </p>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="text-base font-medium text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-base font-semibold text-ink-secondary">
          {selected.length === 0 && "Pick 2 or 3 to start."}
          {selected.length === 1 && `Pick one more.`}
          {selected.length === 2 && "One more if you want."}
          {selected.length === 3 && "Locked in. Ready when you are."}
        </p>
        <button
          type="submit"
          disabled={isPending || remaining > 0}
          className="btn-huge"
        >
          {isPending ? "Building this week's quests..." : "Start the loop"}
        </button>
      </div>
    </form>
  );
}
