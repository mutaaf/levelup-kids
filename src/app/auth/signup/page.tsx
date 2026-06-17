import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = {
  title: "Sign up — LevelUp Kids",
  description:
    "Sign up for LevelUp Kids with a one-tap email link. No passwords, no social profiles linked.",
};

export default function SignUpPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-screen-md flex-col px-6 py-12 sm:py-16">
      <header className="mb-12 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-3">
          <span
            aria-hidden
            className="inline-block size-3 rounded-full bg-brand-500"
          />
          <span className="text-sm tracking-widest text-ink-secondary uppercase">
            LevelUp Kids
          </span>
        </Link>
        <Link
          href="/auth/signin"
          className="text-sm text-ink-secondary underline-offset-4 hover:underline"
        >
          Already signed up? Sign in.
        </Link>
      </header>

      <section className="flex flex-1 flex-col gap-10">
        <h1
          className="font-display text-balance"
          style={{
            fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif",
            fontSize: "var(--text-h1)",
            lineHeight: 1.05,
            letterSpacing: "-0.01em",
          }}
        >
          Sign up to LevelUp Kids.
        </h1>
        <AuthForm mode="signup" />
      </section>

      <footer className="mt-16 text-sm text-ink-muted">
        By signing up you accept the{" "}
        <Link href="/terms" className="underline-offset-4 hover:underline">
          terms
        </Link>{" "}
        and the{" "}
        <Link href="/privacy" className="underline-offset-4 hover:underline">
          privacy promise
        </Link>
        .
      </footer>
    </main>
  );
}
