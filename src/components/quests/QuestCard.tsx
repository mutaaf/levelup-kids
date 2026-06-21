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
      className="relative flex flex-col gap-3 rounded-lg bg-card p-5 shadow-sm"
      style={{ borderLeft: `4px solid ${tint}` }}
    >
      <header className="flex items-start justify-between gap-3">
        <h3
          className="font-display text-xl"
          style={{
            fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif",
            lineHeight: 1.15,
          }}
        >
          {title}
        </h3>
        <span
          className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
          style={{ backgroundColor: tint }}
        >
          {PILLAR_COPY[pillar].title}
        </span>
      </header>

      <p className="text-sm text-ink-secondary">{description}</p>

      <footer className="mt-2 flex items-center justify-between">
        <span className="text-xs font-medium tracking-wider text-ink-muted uppercase">
          +{xpReward} XP
        </span>

        {state === "idle" && (
          <button
            type="button"
            onClick={onDoneClick}
            disabled={isPending}
            className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-60"
          >
            {isPending ? "Saving..." : "I did it"}
          </button>
        )}

        {state === "ready" && (
          <span className="rounded-full bg-tinted px-3 py-1.5 text-xs font-medium text-ink-secondary">
            Waiting for approval
          </span>
        )}

        {state === "approved" && (
          <span
            className="rounded-full px-3 py-1.5 text-xs font-medium text-white"
            style={{ backgroundColor: "var(--success)" }}
          >
            ✓ Approved + {xpReward} XP
          </span>
        )}
      </footer>

      {error && (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </article>
  );
}
