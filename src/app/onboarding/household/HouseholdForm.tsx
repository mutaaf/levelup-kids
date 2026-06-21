"use client";

import { useState, useTransition } from "react";
import { createHousehold } from "./actions";

export function HouseholdForm({
  defaultParentName,
}: {
  defaultParentName: string;
}) {
  const [householdName, setHouseholdName] = useState("");
  const [parentName, setParentName] = useState(defaultParentName);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createHousehold({ householdName, parentName });
      if (result && !result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label
          htmlFor="household-name"
          className="text-sm font-medium text-ink-primary"
        >
          Household name
        </label>
        <input
          id="household-name"
          name="household-name"
          type="text"
          inputMode="text"
          autoComplete="off"
          autoFocus
          value={householdName}
          onChange={(e) => setHouseholdName(e.target.value)}
          placeholder="The Aziz Family"
          className="rounded-md border border-ink-muted/30 bg-card px-4 py-3 text-base focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none"
          maxLength={60}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="parent-name"
          className="text-sm font-medium text-ink-primary"
        >
          Your name
        </label>
        <input
          id="parent-name"
          name="parent-name"
          type="text"
          autoComplete="given-name"
          value={parentName}
          onChange={(e) => setParentName(e.target.value)}
          placeholder="Imran"
          className="rounded-md border border-ink-muted/30 bg-card px-4 py-3 text-base focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none"
          maxLength={60}
          required
        />
      </div>

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || !householdName.trim() || !parentName.trim()}
        className="mt-2 rounded-md bg-brand-500 px-5 py-3 text-base font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Continue"}
      </button>
    </form>
  );
}
