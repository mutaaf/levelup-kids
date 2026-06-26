"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Status =
  | { kind: "idle" }
  | { kind: "info"; text: string }
  | { kind: "ok"; text: string }
  | { kind: "err"; text: string };

type ByokResult = { ok: true } | { ok: false; error: string };

/** Plain fetch to one of /api/byok/{test,save,clear}. No server-action RPC,
 *  no React-transition error bubbling — just HTTP + JSON. Any network failure
 *  surfaces as { ok: false, error } and can't crash the page. */
async function byokFetch(
  path: "test" | "save" | "clear",
  body?: { key: string },
): Promise<ByokResult> {
  try {
    const r = await fetch(`/api/byok/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : "{}",
    });
    const text = await r.text();
    if (!text) {
      return {
        ok: false,
        error: `Empty response from /api/byok/${path} (HTTP ${r.status}).`,
      };
    }
    try {
      const parsed = JSON.parse(text) as ByokResult;
      return parsed;
    } catch {
      return {
        ok: false,
        error: `Bad response shape from /api/byok/${path}: ${text.slice(0, 200)}`,
      };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network error.";
    return { ok: false, error: msg };
  }
}

export function AnthropicKeyForm({
  currentMask,
  updatedAt,
  envKeyPresent,
}: {
  currentMask: string | null;
  updatedAt: string | null;
  envKeyPresent: boolean;
}) {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [busy, startTransition] = useTransition();
  const updatedAtLabel =
    updatedAt && new Date(updatedAt).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });

  function onTest() {
    setStatus({ kind: "info", text: "Pinging Anthropic…" });
    startTransition(async () => {
      const r = await byokFetch("test", { key });
      setStatus(
        r.ok
          ? { kind: "ok", text: "Key works. Anthropic accepted the ping." }
          : { kind: "err", text: r.error },
      );
    });
  }

  function onSave() {
    setStatus({ kind: "info", text: "Saving…" });
    startTransition(async () => {
      const r = await byokFetch("save", { key });
      if (r.ok) {
        setKey("");
        setStatus({
          kind: "ok",
          text: "Key saved. The Family Coach will use it on the next question.",
        });
        router.refresh();
      } else {
        setStatus({ kind: "err", text: r.error });
      }
    });
  }

  function onTestThenSave() {
    setStatus({ kind: "info", text: "Pinging Anthropic…" });
    startTransition(async () => {
      const t = await byokFetch("test", { key });
      if (!t.ok) {
        setStatus({ kind: "err", text: t.error });
        return;
      }
      setStatus({ kind: "info", text: "Ping good. Saving…" });
      const s = await byokFetch("save", { key });
      if (s.ok) {
        setKey("");
        setStatus({
          kind: "ok",
          text: "Key tested and saved. The Family Coach is live for your household.",
        });
        router.refresh();
      } else {
        setStatus({ kind: "err", text: s.error });
      }
    });
  }

  function onClear() {
    if (
      !confirm(
        "Remove the saved key? The Coach will stop working unless the project has a fallback key set.",
      )
    ) {
      return;
    }
    setStatus({ kind: "info", text: "Clearing…" });
    startTransition(async () => {
      const r = await byokFetch("clear");
      if (r.ok) {
        setStatus({ kind: "ok", text: "Key removed." });
        router.refresh();
      } else {
        setStatus({ kind: "err", text: r.error });
      }
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg bg-card p-5 shadow-sm">
      {currentMask ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs tracking-widest text-ink-muted uppercase">
                Current key
              </p>
              <p className="mt-1 font-mono text-base text-ink-primary">
                {currentMask}
              </p>
              {updatedAtLabel && (
                <p className="mt-0.5 text-xs text-ink-muted">
                  Saved {updatedAtLabel}
                </p>
              )}
            </div>
            <span
              className="rounded-full px-3 py-1 text-xs font-medium text-white"
              style={{ backgroundColor: "var(--success)" }}
            >
              Coach live
            </span>
          </div>
        </div>
      ) : envKeyPresent ? (
        <p className="text-sm text-ink-secondary">
          Using the project&apos;s fallback key. Paste your own below to take
          over the billing for your household.
        </p>
      ) : (
        <p className="text-sm text-ink-secondary">
          No key set. The Coach is disabled until you add one below.
        </p>
      )}

      <div className="flex flex-col gap-2">
        <label
          htmlFor="anthropic-key"
          className="text-sm font-medium text-ink-primary"
        >
          {currentMask ? "Replace key" : "Anthropic API key"}
        </label>
        <input
          id="anthropic-key"
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={key}
          onChange={(e) => {
            setKey(e.target.value);
            if (status.kind !== "idle") setStatus({ kind: "idle" });
          }}
          placeholder="sk-ant-..."
          className="rounded-md border border-ink-muted/30 bg-paper px-3 py-2 font-mono text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 focus:outline-none"
        />
      </div>

      {status.kind !== "idle" && (
        <p
          role="status"
          className={
            status.kind === "ok"
              ? "text-sm"
              : status.kind === "err"
                ? "text-sm text-danger"
                : "text-sm text-ink-secondary"
          }
          style={status.kind === "ok" ? { color: "var(--success)" } : undefined}
        >
          {status.text}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onTestThenSave}
          disabled={busy || !key.trim()}
          className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Working..." : "Test & save"}
        </button>
        <button
          type="button"
          onClick={onTest}
          disabled={busy || !key.trim()}
          className="rounded-md border border-ink-muted/30 px-4 py-2 text-sm text-ink-primary transition hover:bg-tinted disabled:opacity-60"
        >
          Test only
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={busy || !key.trim()}
          className="rounded-md border border-ink-muted/30 px-4 py-2 text-sm text-ink-primary transition hover:bg-tinted disabled:opacity-60"
        >
          Save without testing
        </button>
        {currentMask && (
          <button
            type="button"
            onClick={onClear}
            disabled={busy}
            className="ml-auto rounded-md px-4 py-2 text-sm text-danger underline-offset-2 hover:underline disabled:opacity-60"
          >
            Remove key
          </button>
        )}
      </div>
    </div>
  );
}
