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
              className={`relative flex flex-col items-start gap-2 rounded-lg border-l-4 p-4 text-left transition ${
                isSelected
                  ? "bg-card shadow-md"
                  : "bg-card/60 hover:bg-card"
              }`}
              style={{
                borderLeftColor: p.tint,
                backgroundColor: isSelected
                  ? `color-mix(in srgb, ${p.tint} 8%, var(--surface-card))`
                  : undefined,
              }}
            >
              <div className="flex w-full items-start justify-between">
                <h2
                  className="font-display text-lg"
                  style={{
                    fontFamily:
                      "var(--font-fraunces), ui-serif, Georgia, serif",
                  }}
                >
                  {p.title}
                </h2>
                {isSelected && (
                  <span
                    className="inline-flex size-5 items-center justify-center rounded-full text-xs text-white"
                    style={{ backgroundColor: p.tint }}
                    aria-hidden
                  >
                    ✓
                  </span>
                )}
              </div>
              <p className="text-sm text-ink-secondary">{p.body}</p>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-secondary">
          {selected.length === 0 && "Pick 2 or 3."}
          {selected.length === 1 && `Pick one more.`}
          {selected.length === 2 && "One more is optional."}
          {selected.length === 3 && "Locked in."}
        </p>
        <button
          type="submit"
          disabled={isPending || remaining > 0}
          className="rounded-md bg-brand-500 px-5 py-3 text-base font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Seeding quests..." : "Continue"}
        </button>
      </div>
    </form>
  );
}
