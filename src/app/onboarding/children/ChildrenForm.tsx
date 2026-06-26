"use client";

import { useState, useTransition } from "react";
import { AVATARS } from "@/lib/children/avatars";
import { setChildren, type ChildInput } from "./actions";

type Draft = { name: string; age: number; avatar: string };

const EMPTY: Draft = { name: "", age: 7, avatar: AVATARS[0] };

export function ChildrenForm({ initial }: { initial: Draft[] }) {
  const [kids, setKids] = useState<Draft[]>(
    initial.length > 0 ? initial : [{ ...EMPTY }],
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function update(i: number, patch: Partial<Draft>) {
    setKids((cur) => cur.map((k, idx) => (idx === i ? { ...k, ...patch } : k)));
  }
  function addChild() {
    if (kids.length >= 3) return;
    setKids((cur) => [...cur, { ...EMPTY }]);
  }
  function removeChild(i: number) {
    setKids((cur) => cur.filter((_, idx) => idx !== i));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const payload: ChildInput[] = kids.map((k) => ({
      name: k.name.trim(),
      age: k.age,
      avatar: k.avatar,
    }));
    startTransition(async () => {
      const result = await setChildren(payload);
      if (result && !result.ok) setError(result.error);
    });
  }

  const allValid = kids.every(
    (k) => k.name.trim().length > 0 && k.age >= 4 && k.age <= 17,
  );

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      {kids.map((kid, i) => (
        <div
          key={i}
          className="rounded-3xl bg-card p-5 shadow-md sm:p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <span
              className="text-lg font-bold"
              style={{
                fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif",
                letterSpacing: "-0.01em",
              }}
            >
              {kid.name.trim() || `Child ${i + 1}`}
            </span>
            {kids.length > 1 && (
              <button
                type="button"
                onClick={() => removeChild(i)}
                className="text-sm font-medium text-ink-muted underline-offset-2 hover:text-danger hover:underline"
              >
                Remove
              </button>
            )}
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label
                htmlFor={`name-${i}`}
                className="mb-2 block text-base font-semibold text-ink-primary"
              >
                First name
              </label>
              <input
                id={`name-${i}`}
                type="text"
                value={kid.name}
                onChange={(e) => update(i, { name: e.target.value })}
                placeholder="Zara"
                maxLength={24}
                className="input-chunky"
                required
              />
            </div>
            <div className="sm:w-32">
              <label
                htmlFor={`age-${i}`}
                className="mb-2 block text-base font-semibold text-ink-primary"
              >
                Age
              </label>
              <input
                id={`age-${i}`}
                type="number"
                min={4}
                max={17}
                value={kid.age}
                onChange={(e) =>
                  update(i, { age: parseInt(e.target.value || "7", 10) })
                }
                className="input-chunky text-center"
                required
              />
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-base font-semibold text-ink-primary">
              Pick an avatar
            </p>
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
              {AVATARS.map((a) => {
                const selected = kid.avatar === a;
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => update(i, { avatar: a })}
                    aria-label={`Avatar ${a}`}
                    aria-pressed={selected}
                    className="flex aspect-square items-center justify-center rounded-2xl text-3xl transition-all"
                    style={{
                      backgroundColor: selected
                        ? "color-mix(in srgb, var(--brand-500) 15%, var(--surface-card))"
                        : "var(--surface-tinted)",
                      boxShadow: selected
                        ? "0 0 0 3px var(--brand-500), 0 6px 16px -6px rgba(208, 86, 43, 0.45)"
                        : "none",
                      transform: selected ? "translateY(-1px)" : "none",
                    }}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ))}

      {kids.length < 3 && (
        <button
          type="button"
          onClick={addChild}
          className="rounded-2xl border-2 border-dashed border-ink-muted/30 bg-card/60 px-5 py-4 text-base font-semibold text-ink-secondary transition-colors hover:border-brand-500 hover:bg-card hover:text-brand-500"
        >
          + Add another kid
        </button>
      )}

      {error && (
        <p className="text-base font-medium text-danger" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || !allValid}
        className="btn-huge w-full"
      >
        {isPending ? "Saving..." : "Continue"}
      </button>
    </form>
  );
}
