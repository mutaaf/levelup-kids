"use client";

import { useState, useTransition } from "react";

export function ShareScoreButton({
  householdName,
}: {
  householdName: string;
}) {
  const [busy, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  async function onShare() {
    setStatus(null);
    startTransition(async () => {
      let token: string;
      try {
        const r = await fetch("/api/share/ensure-token", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
        });
        const j = (await r.json()) as
          | { ok: true; token: string }
          | { ok: false; error: string };
        if (!j.ok) {
          setStatus(j.error);
          return;
        }
        token = j.token;
      } catch (e) {
        setStatus(e instanceof Error ? e.message : "Network error.");
        return;
      }

      const cardUrl = `${window.location.origin}/api/share/score-card?token=${encodeURIComponent(token)}`;

      // Use Web Share API on mobile if available — most native experience.
      if (typeof navigator !== "undefined" && "share" in navigator) {
        try {
          await navigator.share({
            title: `${householdName} · Family Growth Score`,
            text: `Our family is leveling up.`,
            url: cardUrl,
          });
          setStatus("Shared.");
          return;
        } catch {
          // user cancelled or share not supported; fall through to copy
        }
      }

      // Fallback: copy the URL.
      try {
        await navigator.clipboard.writeText(cardUrl);
        setStatus("Link copied — paste it anywhere.");
      } catch {
        setStatus(
          "Couldn't open the share sheet. Visit Settings → Family display to copy a URL.",
        );
      }
    });
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={onShare}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Preparing…" : "Share this month's score"}
      </button>
      {status && (
        <p className="text-xs text-ink-secondary" role="status">
          {status}
        </p>
      )}
    </div>
  );
}
