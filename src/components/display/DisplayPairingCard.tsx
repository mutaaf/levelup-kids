"use client";

import { useState, useTransition } from "react";
import QRCode from "qrcode";
import { createDisplay, revokeDisplay } from "@/app/settings/display-actions";

export type DisplayRow = {
  token: string;
  label: string | null;
  created_at: string;
  last_seen_at: string | null;
};

function ago(iso: string | null): string {
  if (!iso) return "Never opened";
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return "Just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

export function DisplayPairingCard({
  displays,
  baseUrl,
}: {
  displays: DisplayRow[];
  baseUrl: string;
}) {
  const [label, setLabel] = useState("");
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ url: string; qrSvg: string } | null>(
    null,
  );

  async function makeQr(url: string): Promise<string> {
    return QRCode.toString(url, {
      type: "svg",
      margin: 1,
      width: 240,
      color: {
        dark: "#1f1b16",
        light: "#faf7f2",
      },
    });
  }

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await createDisplay(label);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      const url = `${baseUrl}/display/${r.token}`;
      const qrSvg = await makeQr(url);
      setCreated({ url, qrSvg });
      setLabel("");
    });
  }

  function onRevoke(token: string) {
    if (!confirm("Remove this display? The URL will stop working immediately.")) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await revokeDisplay(token);
      if (!r.ok) setError(r.error);
    });
  }

  async function onCopy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg bg-card p-5 shadow-sm">
      {created && (
        <div className="flex flex-col gap-4 rounded-md border border-success/30 bg-success/5 p-4 sm:flex-row sm:items-center">
          <div
            className="size-32 shrink-0 rounded-md bg-paper p-2"
            dangerouslySetInnerHTML={{ __html: created.qrSvg }}
          />
          <div className="flex-1">
            <p
              className="text-sm font-medium"
              style={{ color: "var(--success)" }}
            >
              Display ready. Open this URL on your iPad / Echo Show / TV.
            </p>
            <p className="mt-2 font-mono text-xs break-all text-ink-secondary">
              {created.url}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onCopy(created.url)}
                className="rounded-md border border-ink-muted/30 px-3 py-1.5 text-sm text-ink-primary hover:bg-tinted"
              >
                Copy URL
              </button>
              <a
                href={created.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600"
              >
                Open now
              </a>
              <button
                type="button"
                onClick={() => setCreated(null)}
                className="ml-auto rounded-md px-3 py-1.5 text-sm text-ink-secondary underline-offset-2 hover:underline"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {displays.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs tracking-widest text-ink-muted uppercase">
            Paired displays
          </p>
          {displays.map((d) => {
            const url = `${baseUrl}/display/${d.token}`;
            return (
              <div
                key={d.token}
                className="flex flex-col gap-2 rounded-md border border-ink-muted/15 p-3 sm:flex-row sm:items-center sm:gap-4"
              >
                <div className="flex-1">
                  <p className="font-medium text-ink-primary">
                    {d.label || "Untitled display"}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {ago(d.last_seen_at)} · paired{" "}
                    {new Date(d.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2 sm:ml-auto">
                  <button
                    type="button"
                    onClick={() => onCopy(url)}
                    className="rounded-md border border-ink-muted/30 px-3 py-1.5 text-xs text-ink-primary hover:bg-tinted"
                  >
                    Copy URL
                  </button>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-ink-muted/30 px-3 py-1.5 text-xs text-ink-primary hover:bg-tinted"
                  >
                    Open
                  </a>
                  <button
                    type="button"
                    onClick={() => onRevoke(d.token)}
                    disabled={busy}
                    className="rounded-md px-3 py-1.5 text-xs text-danger underline-offset-2 hover:underline disabled:opacity-60"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <form onSubmit={onCreate} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="display-label" className="text-sm font-medium text-ink-primary">
            Add a display
          </label>
          <input
            id="display-label"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Kitchen iPad"
            maxLength={40}
            className="rounded-md border border-ink-muted/30 bg-paper px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Working..." : "Generate display URL"}
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
