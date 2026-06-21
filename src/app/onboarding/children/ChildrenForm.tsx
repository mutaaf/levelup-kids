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
          className="rounded-lg border border-ink-muted/20 bg-card p-5 shadow-sm"
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-medium text-ink-secondary">
              Child {i + 1}
            </span>
            {kids.length > 1 && (
              <button
                type="button"
                onClick={() => removeChild(i)}
                className="text-sm text-ink-muted underline-offset-2 hover:text-danger hover:underline"
              >
                Remove
              </button>
            )}
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label
                htmlFor={`name-${i}`}
                className="mb-1 block text-sm font-medium text-ink-primary"
              >
                First name
              </label>
              <input
                id={`name-${i}`}
                type="text"
                value={kid.name}
                onChange={(e) => update(i, { name: e.target.value })}
                placeholder="Layla"
                maxLength={24}
                className="w-full rounded-md border border-ink-muted/30 bg-paper px-4 py-3 text-base focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none"
                required
              />
            </div>
            <div className="sm:w-32">
              <label
                htmlFor={`age-${i}`}
                className="mb-1 block text-sm font-medium text-ink-primary"
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
                className="w-full rounded-md border border-ink-muted/30 bg-paper px-4 py-3 text-base focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-ink-primary">
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
                    className={`flex aspect-square items-center justify-center rounded-md text-2xl transition ${
                      selected
                        ? "bg-brand-500 ring-2 ring-brand-500 ring-offset-2 ring-offset-paper"
                        : "bg-tinted hover:bg-tinted/70"
                    }`}
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
          className="self-start rounded-md border border-dashed border-ink-muted/40 px-4 py-2 text-sm text-ink-secondary hover:border-brand-500 hover:text-brand-500"
        >
          + Add another child
        </button>
      )}

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || !allValid}
        className="rounded-md bg-brand-500 px-5 py-3 text-base font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Continue"}
      </button>
    </form>
  );
}
