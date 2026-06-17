"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrowserSupabase } from "@/lib/supabase/browser";

export type AuthMode = "signup" | "signin";

interface AuthFormProps {
  mode: AuthMode;
}

const COPY: Record<
  AuthMode,
  { h1: string; description: string; rateLimit: string }
> = {
  signup: {
    h1: "Sign up to LevelUp Kids.",
    description:
      "We send you a one-tap sign-in link. No password to remember, no link to social profiles.",
    rateLimit: "We just sent a link a moment ago. Check your inbox.",
  },
  signin: {
    h1: "Welcome back.",
    description:
      "Enter the email you used to sign up. We send a fresh sign-in link each time.",
    rateLimit: "We just sent a link a moment ago. Check your inbox.",
  },
};

// Minimum visible loading time. The form must stay in its in-flight state
// long enough that a parent on a fast connection still sees the spinner —
// otherwise the UI feels broken on success ("did anything happen?").
//
// Ticket 0003 AC: "the button enters a loading state for ≥ 400ms".
const MIN_LOADING_MS = 600;

// Minimal email shape check — defers to the browser's native `type="email"`
// validation for the rest. Done in JS too so we can surface an inline error
// without waiting for a network round-trip.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthForm({ mode }: AuthFormProps) {
  const copy = COPY[mode];
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setError("Enter a valid email address.");
      return;
    }
    setSubmitting(true);
    const startedAt = Date.now();
    try {
      const supabase = createBrowserSupabase();
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          shouldCreateUser: mode === "signup",
        },
      });
      if (error) {
        const isRateLimited =
          error.status === 429 ||
          /rate.?limit/i.test(error.message) ||
          /for security purposes/i.test(error.message);
        setError(isRateLimited ? copy.rateLimit : error.message);
        return;
      }
      // Wait out the rest of the floor so the success state never flashes by.
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_LOADING_MS) {
        await new Promise((r) => setTimeout(r, MIN_LOADING_MS - elapsed));
      }
      startTransition(() => setSent(true));
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <section
        aria-live="polite"
        className="mx-auto flex w-full max-w-md flex-col gap-4 text-center"
        data-auth-form-state="sent"
      >
        <h2
          className="font-display text-balance"
          style={{
            fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif",
            fontSize: "var(--text-h1)",
            lineHeight: 1.05,
            letterSpacing: "-0.01em",
          }}
        >
          Check your inbox.
        </h2>
        <p className="text-ink-secondary">
          We sent a sign-in link to{" "}
          <span className="text-ink-primary">{email}</span>. The link expires
          in 60 minutes.
        </p>
        <p className="text-sm text-ink-muted">
          No email? Check your spam folder, then{" "}
          <button
            type="button"
            className="text-brand-600 underline-offset-4 hover:underline"
            onClick={() => {
              setSent(false);
              setError(null);
            }}
          >
            try a different address
          </button>
          .
        </p>
      </section>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardContent className="flex flex-col gap-6 p-6 sm:p-8">
        <p className="text-ink-secondary">{copy.description}</p>
        <form
          data-auth-form={mode}
          onSubmit={onSubmit}
          noValidate={false}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
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
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "auth-form-error" : undefined}
              placeholder="you@example.com"
            />
          </div>
          {error ? (
            <p
              id="auth-form-error"
              role="alert"
              className="text-sm text-danger"
            >
              {error}
            </p>
          ) : null}
          <Button
            type="submit"
            size="lg"
            disabled={submitting}
            aria-busy={submitting || undefined}
          >
            {submitting ? "Sending the link…" : "Send me a link"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
