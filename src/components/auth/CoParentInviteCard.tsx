"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createInvite, revokeInvite } from "@/app/settings/invite-actions";

export type PendingInvite = {
  token: string;
  email: string | null;
  created_at: string;
  expires_at: string;
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function CoParentInviteCard({
  baseUrl,
  pending,
}: {
  baseUrl: string;
  pending: PendingInvite[];
}) {
  const router = useRouter();
  const [emailHint, setEmailHint] = useState("");
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await createInvite(emailHint);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setCreatedToken(r.token);
      setEmailHint("");
      router.refresh();
    });
  }

  function onRevoke(token: string) {
    if (!confirm("Remove this invite? The link will stop working.")) return;
    setError(null);
    startTransition(async () => {
      const r = await revokeInvite(token);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      if (createdToken === token) setCreatedToken(null);
      router.refresh();
    });
  }

  async function onCopy(token: string) {
    const url = `${baseUrl}/invite/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      setTimeout(
        () => setCopiedToken((cur) => (cur === token ? null : cur)),
        1800,
      );
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-sm">
      {createdToken && (
        <div className="flex flex-col gap-3 rounded-xl border border-success/30 bg-success/5 p-4">
          <p
            className="text-base font-semibold"
            style={{ color: "var(--success)" }}
          >
            Invite link ready. Send it to them.
          </p>
          <p className="rounded-lg bg-tinted px-3 py-2 font-mono text-xs break-all text-ink-primary">
            {baseUrl}/invite/{createdToken}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onCopy(createdToken)}
              className="rounded-md border border-ink-muted/30 px-3 py-1.5 text-sm text-ink-primary hover:bg-tinted"
            >
              {copiedToken === createdToken ? "Copied!" : "Copy link"}
            </button>
            <button
              type="button"
              onClick={() => setCreatedToken(null)}
              className="ml-auto rounded-md px-3 py-1.5 text-sm text-ink-secondary underline-offset-2 hover:underline"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold tracking-widest text-ink-muted uppercase">
            Pending invites
          </p>
          {pending.map((p) => (
            <div
              key={p.token}
              className="flex flex-col gap-2 rounded-xl border border-ink-muted/15 p-3 sm:flex-row sm:items-center sm:gap-4"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink-primary">
                  {p.email || "Anyone with the link"}
                </p>
                <p className="text-xs text-ink-muted">
                  Sent {fmt(p.created_at)} · expires {fmt(p.expires_at)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 sm:ml-auto">
                <button
                  type="button"
                  onClick={() => onCopy(p.token)}
                  className="rounded-md border border-ink-muted/30 px-3 py-1.5 text-xs text-ink-primary hover:bg-tinted"
                >
                  {copiedToken === p.token ? "Copied!" : "Copy link"}
                </button>
                <button
                  type="button"
                  onClick={() => onRevoke(p.token)}
                  disabled={busy}
                  className="rounded-md px-3 py-1.5 text-xs text-danger underline-offset-2 hover:underline disabled:opacity-60"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={onCreate}
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
      >
        <div className="flex flex-1 flex-col gap-1">
          <label
            htmlFor="invite-email"
            className="text-sm font-medium text-ink-primary"
          >
            Invite a co-parent
          </label>
          <input
            id="invite-email"
            type="email"
            value={emailHint}
            onChange={(e) => setEmailHint(e.target.value)}
            placeholder="sara@example.com (optional)"
            className="rounded-md border border-ink-muted/30 bg-paper px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none"
          />
          <p className="text-xs text-ink-muted">
            We generate a link — you share it however works for your family
            (text, AirDrop, email). The email field is just a note for your
            own list.
          </p>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Generating…" : "Generate invite link"}
        </button>
      </form>

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
