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
          className="text-base font-semibold text-ink-primary"
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
          className="input-chunky"
          maxLength={60}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="parent-name"
          className="text-base font-semibold text-ink-primary"
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
          className="input-chunky"
          maxLength={60}
          required
        />
      </div>

      {error && (
        <p className="text-base font-medium text-danger" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || !householdName.trim() || !parentName.trim()}
        className="btn-huge w-full"
      >
        {isPending ? "Saving..." : "Continue"}
      </button>
    </form>
  );
}
