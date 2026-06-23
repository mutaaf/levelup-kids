"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";

/** POST /api/auth/verify on the server — server runs verifyOtp + sets
 *  cookies + ensures parents row + returns {next}. No client-side cookie
 *  writes anywhere. */
/** Verify the OTP server-side. Returns the full response object so we
 *  can show the debug block in the UI when sign-in finishes. */
async function verifyCodeOnServer(email: string, code: string) {
  try {
    const r = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
      credentials: "same-origin",
      cache: "no-store",
    });
    const text = await r.text();
    if (!text) {
      return {
        ok: false as const,
        error: `Empty response (HTTP ${r.status})`,
      };
    }
    try {
      return JSON.parse(text) as
        | { ok: true; next: string; debug?: unknown }
        | { ok: false; error: string };
    } catch {
      return {
        ok: false as const,
        error: `Unparseable response (HTTP ${r.status}): ${text.slice(0, 100)}`,
      };
    }
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

async function fetchWhoami(): Promise<unknown> {
  try {
    const r = await fetch("/api/debug/whoami", {
      credentials: "same-origin",
      cache: "no-store",
    });
    return await r.json();
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "whoami fetch failed",
    };
  }
}

export type AuthMode = "signup" | "signin";

interface AuthFormProps {
  mode: AuthMode;
}

const COPY: Record<AuthMode, { h1: string; description: string }> = {
  signup: {
    h1: "Sign up to LevelUp Kids.",
    description:
      "Enter your email. We'll send you a 6-digit code. No password to remember.",
  },
  signin: {
    h1: "Welcome back.",
    description:
      "Enter the email you signed up with. We'll send you a 6-digit code.",
  },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_RE = /^\d{6}$/;

type DiagnosticBlob = {
  verifyResponse: unknown;
  whoamiResponse: unknown;
};

type Phase =
  | { kind: "enter-email" }
  | { kind: "enter-code"; email: string }
  | { kind: "verifying" }
  | { kind: "success"; next: string; diag: DiagnosticBlob };

export function AuthForm({ mode }: AuthFormProps) {
  const copy = COPY[mode];
  const [phase, setPhase] = useState<Phase>({ kind: "enter-email" });
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  // Autofocus the code field when we move to enter-code phase.
  useEffect(() => {
    if (phase.kind === "enter-code") {
      codeInputRef.current?.focus();
    }
  }, [phase.kind]);

  async function onSubmitEmail(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setError("Enter a valid email address.");
      return;
    }
    setSubmitting(true);
    try {
      const supabase = createBrowserSupabase();
      // No emailRedirectTo — this triggers Supabase to send the OTP code
      // (using the `{{ .Token }}` field in the email template) rather than
      // a magic-link URL. Combined with the email template's removal of
      // {{ .ConfirmationURL }}, the user sees a 6-digit code.
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          shouldCreateUser: mode === "signup",
        },
      });
      if (error) {
        const isRate =
          error.status === 429 ||
          /rate.?limit|for security purposes/i.test(error.message);
        setError(
          isRate
            ? "We just sent a code a moment ago. Check your inbox, or wait a minute and try again."
            : error.message,
        );
        return;
      }
      setPhase({ kind: "enter-code", email: trimmed });
      setCode("");
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmitCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const trimmed = code.replace(/\s/g, "");
    if (!CODE_RE.test(trimmed)) {
      setError("Enter the 6-digit code from the email.");
      return;
    }
    if (phase.kind !== "enter-code") return;

    setSubmitting(true);
    setPhase({ kind: "verifying" });
    try {
      const result = await verifyCodeOnServer(phase.email, trimmed);
      // Always log to console so the user can paste it back even if
      // the network response body was lost.
      console.log("[AuthForm] verify response:", result);
      if (!result.ok) {
        setPhase({ kind: "enter-code", email: phase.email });
        setError(result.error);
        return;
      }
      // DIAGNOSTIC PATH (2026-06-22): cookies aren't landing despite
      // multiple architecture changes. Don't auto-nav — fetch whoami
      // IMMEDIATELY after verify and show both responses in the UI so
      // we can see whether the session persists across this single fetch
      // round-trip. The user copies the JSON back.
      const whoami = await fetchWhoami();
      console.log("[AuthForm] whoami response:", whoami);
      setPhase({
        kind: "success",
        next: result.next,
        diag: { verifyResponse: result, whoamiResponse: whoami },
      });
    } catch (e) {
      setPhase({ kind: "enter-code", email: phase.email });
      setError(e instanceof Error ? e.message : "Verification failed.");
    } finally {
      setSubmitting(false);
    }
  }

  function resetToEmail() {
    setPhase({ kind: "enter-email" });
    setCode("");
    setError(null);
  }

  if (phase.kind === "success") {
    const verifyJson = JSON.stringify(phase.diag.verifyResponse, null, 2);
    const whoamiJson = JSON.stringify(phase.diag.whoamiResponse, null, 2);
    return (
      <section
        aria-live="polite"
        className="mx-auto flex w-full max-w-2xl flex-col gap-4"
      >
        <div className="flex items-center gap-3 text-center">
          <div
            className="flex size-12 items-center justify-center rounded-2xl text-xl text-white shadow-md"
            style={{ backgroundColor: "var(--success)" }}
            aria-hidden
          >
            ✓
          </div>
          <p
            className="font-display text-xl"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            Verify call returned. Cookie diagnostic below.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-ink-secondary">
            /api/auth/verify response
          </p>
          <pre
            className="overflow-x-auto rounded-2xl bg-tinted p-4 text-xs"
            style={{ fontFamily: "ui-monospace, monospace" }}
          >
            {verifyJson}
          </pre>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-ink-secondary">
            /api/debug/whoami response (immediately after verify)
          </p>
          <pre
            className="overflow-x-auto rounded-2xl bg-tinted p-4 text-xs"
            style={{ fontFamily: "ui-monospace, monospace" }}
          >
            {whoamiJson}
          </pre>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => window.location.replace(phase.next)}
            className="btn-primary"
          >
            Continue to {phase.next}
          </button>
          <button
            type="button"
            onClick={async () => {
              const w = await fetchWhoami();
              setPhase({
                ...phase,
                diag: { ...phase.diag, whoamiResponse: w },
              });
            }}
            className="btn-secondary"
          >
            Re-check whoami
          </button>
        </div>
      </section>
    );
  }

  if (phase.kind === "enter-code" || phase.kind === "verifying") {
    // Capture email for display (verifying loses the discriminator narrowing
    // but the value never changes between enter-code and verifying).
    const displayEmail =
      phase.kind === "enter-code" ? phase.email : "your inbox";
    return (
      <section className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div>
          <h2
            className="font-display text-2xl"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            Check your inbox.
          </h2>
          <p className="mt-2 text-ink-secondary">
            We sent a 6-digit code to{" "}
            <span className="font-semibold text-ink-primary">
              {displayEmail}
            </span>
            .
          </p>
        </div>

        <form onSubmit={onSubmitCode} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="otp-code"
              className="text-base font-semibold text-ink-primary"
            >
              6-digit code
            </label>
            <input
              ref={codeInputRef}
              id="otp-code"
              name="otp-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, ""));
                if (error) setError(null);
              }}
              placeholder="123456"
              className="input-chunky text-center font-mono"
              style={{
                fontSize: "1.75rem",
                letterSpacing: "0.4em",
              }}
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
            disabled={submitting || code.length !== 6}
            className="btn-huge w-full"
          >
            {phase.kind === "verifying" ? "Verifying…" : "Verify & sign in"}
          </button>
        </form>

        <button
          type="button"
          onClick={resetToEmail}
          disabled={submitting}
          className="text-sm font-medium text-ink-secondary underline-offset-2 hover:text-brand-500 hover:underline"
        >
          Use a different email
        </button>
      </section>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-6">
      <p className="text-ink-secondary">{copy.description}</p>
      <form
        data-auth-form={mode}
        onSubmit={onSubmitEmail}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-2">
          <label
            htmlFor="email"
            className="text-base font-semibold text-ink-primary"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            autoFocus
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            placeholder="you@example.com"
            className="input-chunky"
          />
        </div>
        {error && (
          <p className="text-base font-medium text-danger" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="btn-huge w-full"
        >
          {submitting ? "Sending code…" : "Send me a code"}
        </button>
      </form>
    </section>
  );
}
