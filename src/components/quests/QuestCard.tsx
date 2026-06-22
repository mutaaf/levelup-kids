"use client";

import { useState, useTransition } from "react";
import type { PillarSlug } from "@/lib/types/pillar";
import { PILLAR_COPY } from "@/lib/pillars/copy";
import { markQuestReady } from "@/app/(app)/quest-actions";

export type QuestCardProps = {
  questId: string;
  title: string;
  description: string;
  pillar: PillarSlug;
  xpReward: number;
  state: "idle" | "ready" | "approved";
};

export function QuestCard({
  questId,
  title,
  description,
  pillar,
  xpReward,
  state: initialState,
}: QuestCardProps) {
  const [state, setState] = useState(initialState);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const tint = PILLAR_COPY[pillar].tint;
  const tintTitle = PILLAR_COPY[pillar].title;

  function onDoneClick() {
    if (state !== "idle") return;
    setError(null);
    startTransition(async () => {
      const result = await markQuestReady(questId);
      if (result.ok) setState("ready");
      else setError(result.error);
    });
  }

  return (
    <article
      className="relative flex flex-col gap-4 rounded-3xl bg-card p-6 shadow-md transition-transform"
      style={{
        boxShadow:
          state === "approved"
            ? `0 12px 36px -8px color-mix(in srgb, ${tint} 40%, transparent), 0 2px 8px rgba(31, 27, 22, 0.08)`
            : "0 4px 16px rgba(31, 27, 22, 0.07), 0 1px 3px rgba(31, 27, 22, 0.05)",
      }}
    >
      <div
        aria-hidden
        className="absolute top-0 left-0 h-full w-1.5 rounded-l-3xl"
        style={{ backgroundColor: tint }}
      />

      <header className="flex items-start justify-between gap-3">
        <span
          className="rounded-full px-3.5 py-1.5 text-sm font-bold text-white"
          style={{ backgroundColor: tint }}
        >
          {tintTitle}
        </span>
        <span
          className="rounded-full px-3 py-1 text-sm font-bold text-ink-secondary"
          style={{
            backgroundColor: "color-mix(in srgb, var(--brand-500) 10%, transparent)",
            color: "var(--brand-600)",
          }}
        >
          +{xpReward} XP
        </span>
      </header>

      <div>
        <h3
          className="font-display"
          style={{
            fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif",
            fontSize: "1.65rem",
            lineHeight: 1.15,
            letterSpacing: "-0.015em",
          }}
        >
          {title}
        </h3>
        <p className="mt-2 text-[17px] leading-relaxed text-ink-secondary">
          {description}
        </p>
      </div>

      <div className="mt-1">
        {state === "idle" && (
          <button
            type="button"
            onClick={onDoneClick}
            disabled={isPending}
            className="btn-huge w-full"
          >
            {isPending ? "Saving..." : "I did it"}
          </button>
        )}

        {state === "ready" && (
          <div
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-tinted px-6 py-4 text-base font-semibold"
            style={{ color: "var(--ink-secondary)" }}
          >
            <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-warning" />
            Waiting for a grown-up to approve
          </div>
        )}

        {state === "approved" && (
          <div
            className="flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-bold text-white shadow-md"
            style={{
              backgroundColor: "var(--success)",
            }}
          >
            <span aria-hidden>✓</span>
            Done · +{xpReward} XP
          </div>
        )}
      </div>

      {error && (
        <p className="-mt-2 text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      )}
    </article>
  );
}
