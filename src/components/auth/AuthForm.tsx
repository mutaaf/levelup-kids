"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { ensureParentsRow } from "@/app/auth/actions";

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

type Phase =
  | { kind: "enter-email" }
  | { kind: "enter-code"; email: string }
  | { kind: "verifying" }
  | { kind: "success" };

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
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
      const supabase = createBrowserSupabase();
      const { data, error } = await supabase.auth.verifyOtp({
        email: phase.email,
        token: trimmed,
        type: "email",
      });
      if (error || !data?.user) {
        setPhase({ kind: "enter-code", email: phase.email });
        setError(
          /token.*expired|invalid|otp_expired/i.test(error?.message ?? "")
            ? "That code didn't work. Get a fresh one and try again."
            : (error?.message ?? "Verification failed. Try again."),
        );
        return;
      }
      // The browser client now has the session cookies. Ensure the
      // parents row exists, then bounce to the right next step.
      const ensure = await ensureParentsRow({
        email: data.user.email ?? phase.email,
      });
      setPhase({ kind: "success" });
      router.push(ensure.next);
      router.refresh();
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
    return (
      <section
        aria-live="polite"
        className="mx-auto flex w-full max-w-md flex-col items-center gap-3 text-center"
      >
        <div
          className="flex size-14 items-center justify-center rounded-2xl text-2xl text-white shadow-md"
          style={{ backgroundColor: "var(--success)" }}
          aria-hidden
        >
          ✓
        </div>
        <h2
          className="font-display text-2xl"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          You&apos;re in.
        </h2>
        <p className="text-base text-ink-secondary">Loading your family…</p>
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
