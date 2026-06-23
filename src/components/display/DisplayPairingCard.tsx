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

// QR config:
//   - margin 4 = the QR spec's recommended quiet zone (anything less can break
//     mid-distance scanning)
//   - errorCorrectionLevel 'M' = ~15% damage tolerance (fine for a phone scan
//     across a room)
//   - cool slate dark on cool white (matches the new theme; avoids warm bias)
//   - width 256 = enough modules to be scannable from arm's length on a typical
//     phone display; matches the 256px Tailwind size-64 container below.
async function makeQr(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    margin: 4,
    width: 256,
    errorCorrectionLevel: "M",
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
  });
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
  const [created, setCreated] = useState<
    { url: string; qrSvg: string } | null
  >(null);
  const [copied, setCopied] = useState<string | null>(null);

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
    if (
      !confirm("Remove this display? The URL will stop working immediately.")
    ) {
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
      setCopied(url);
      setTimeout(() => setCopied((cur) => (cur === url ? null : cur)), 1800);
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-sm">
      {/* ---------- Just-created success block ---------- */}
      {created && (
        <div className="flex flex-col gap-5 rounded-2xl border border-success/30 bg-success/5 p-5 sm:flex-row sm:items-start">
          <div className="flex shrink-0 justify-center">
            <div
              className="flex aspect-square w-[240px] items-center justify-center rounded-2xl bg-white p-3 shadow-sm sm:w-[200px] lg:w-[240px]"
              // QR svg renders at 256px intrinsic; we let it scale to the
              // container via the [&_svg]:* utility instead of fighting the
              // SVG's own width attr.
            >
              <div
                className="h-full w-full [&_svg]:h-full [&_svg]:w-full"
                dangerouslySetInnerHTML={{ __html: created.qrSvg }}
              />
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <p
              className="text-base font-semibold"
              style={{ color: "var(--success)" }}
            >
              Display ready.
            </p>
            <p className="text-sm text-ink-secondary">
              Scan the QR code on your iPad / Echo Show / TV — or open this URL
              there:
            </p>
            <p className="rounded-lg bg-tinted px-3 py-2 font-mono text-xs break-all text-ink-primary">
              {created.url}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onCopy(created.url)}
                className="rounded-md border border-ink-muted/30 px-3 py-1.5 text-sm text-ink-primary hover:bg-tinted"
              >
                {copied === created.url ? "Copied!" : "Copy URL"}
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

      {/* ---------- Existing paired displays list ---------- */}
      {displays.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold tracking-widest text-ink-muted uppercase">
            Paired displays
          </p>
          {displays.map((d) => {
            const url = `${baseUrl}/display/${d.token}`;
            return (
              <div
                key={d.token}
                className="flex flex-col gap-3 rounded-xl border border-ink-muted/15 p-3 sm:flex-row sm:items-center sm:gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink-primary">
                    {d.label || "Untitled display"}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {ago(d.last_seen_at)} · paired{" "}
                    {new Date(d.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 sm:ml-auto">
                  <button
                    type="button"
                    onClick={() => onCopy(url)}
                    className="rounded-md border border-ink-muted/30 px-3 py-1.5 text-xs text-ink-primary hover:bg-tinted"
                  >
                    {copied === url ? "Copied!" : "Copy URL"}
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

      {/* ---------- Add a new display ---------- */}
      <form
        onSubmit={onCreate}
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
      >
        <div className="flex flex-1 flex-col gap-1">
          <label
            htmlFor="display-label"
            className="text-sm font-medium text-ink-primary"
          >
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
