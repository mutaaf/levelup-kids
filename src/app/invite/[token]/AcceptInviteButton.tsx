"use client";

import { useState, useTransition } from "react";

export function AcceptInviteButton({
  token,
  alreadyAccepted,
}: {
  token: string;
  alreadyAccepted: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  function onAccept() {
    setError(null);
    startTransition(async () => {
      try {
        const r = await fetch("/api/auth/accept-invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
          credentials: "same-origin",
          cache: "no-store",
        });
        const text = await r.text();
        let parsed: { ok: boolean; next?: string; error?: string };
        try {
          parsed = JSON.parse(text);
        } catch {
          setError(`Server error (HTTP ${r.status})`);
          return;
        }
        if (!parsed.ok) {
          setError(parsed.error ?? "Couldn't accept invite.");
          return;
        }
        window.location.replace(parsed.next ?? "/");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Network error.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {alreadyAccepted ? (
        <p className="text-sm text-ink-secondary">
          You&apos;ve already joined this household.{" "}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className="text-brand-600 underline-offset-2 hover:underline">
            Open the family dashboard →
          </a>
        </p>
      ) : (
        <button
          type="button"
          onClick={onAccept}
          disabled={busy}
          className="btn-huge w-fit disabled:opacity-60"
        >
          {busy ? "Joining…" : "Accept and join"}
        </button>
      )}
      {error && (
        <p className="text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
