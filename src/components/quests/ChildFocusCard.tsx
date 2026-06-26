"use client";

import { useState, useTransition } from "react";
import { PILLARS, type PillarSlug } from "@/lib/types/pillar";
import { PILLAR_COPY } from "@/lib/pillars/copy";
import { setChildFocusPillars } from "@/app/settings/child-focus-actions";

export type ChildFocusCardProps = {
  childId: string;
  name: string;
  avatar: string;
  initial: PillarSlug[];
};

const MAX = 4;

export function ChildFocusCard({
  childId,
  name,
  avatar,
  initial,
}: ChildFocusCardProps) {
  const [selected, setSelected] = useState<PillarSlug[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saved">("idle");
  const [isPending, startTransition] = useTransition();

  function toggle(p: PillarSlug) {
    setError(null);
    setStatus("idle");
    setSelected((prev) => {
      if (prev.includes(p)) return prev.filter((x) => x !== p);
      if (prev.length >= MAX) {
        setError(`Max ${MAX} pillars per kid this month.`);
        return prev;
      }
      return [...prev, p];
    });
  }

  function onSave() {
    setError(null);
    setStatus("idle");
    startTransition(async () => {
      const r = await setChildFocusPillars(childId, selected);
      if (r.ok) setStatus("saved");
      else setError(r.error);
    });
  }

  const dirty =
    selected.length !== initial.length ||
    selected.some((p, i) => p !== initial[i]);

  return (
    <article className="rounded-2xl bg-card p-5 shadow-sm">
      <header className="flex items-center gap-3">
        <span
          className="inline-flex size-12 items-center justify-center rounded-2xl bg-paper text-2xl shadow-sm"
          aria-hidden
        >
          {avatar}
        </span>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-ink-primary">{name}</h3>
          <p className="text-xs text-ink-muted">
            {selected.length}/{MAX} pillars · this month
          </p>
        </div>
        {dirty && (
          <button
            type="button"
            onClick={onSave}
            disabled={isPending}
            className="rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
        )}
      </header>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PILLARS.map((p) => {
          const on = selected.includes(p);
          const copy = PILLAR_COPY[p];
          return (
            <button
              type="button"
              key={p}
              onClick={() => toggle(p)}
              className="group relative flex flex-col items-start gap-1 rounded-2xl border-2 p-3 text-left transition-all"
              style={{
                borderColor: on ? copy.tint : "transparent",
                backgroundColor: on
                  ? `color-mix(in srgb, ${copy.tint} 14%, var(--surface-paper))`
                  : "var(--surface-paper)",
                color: on ? copy.tint : "var(--ink-secondary)",
              }}
              aria-pressed={on}
            >
              <span className="text-xs font-bold tracking-wide uppercase">
                {copy.title}
              </span>
              <span
                className="text-xs"
                style={{ color: on ? copy.tint : "var(--ink-muted)" }}
              >
                {on ? "Focusing" : "Tap to add"}
              </span>
            </button>
          );
        })}
      </div>
      {error && (
        <p className="mt-3 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      {status === "saved" && !dirty && (
        <p className="mt-3 text-sm text-success" role="status">
          Saved. New month-focus applies to this week&apos;s reseed.
        </p>
      )}
    </article>
  );
}
