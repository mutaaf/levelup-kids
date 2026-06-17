import Link from "next/link";

export function Landing() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-screen-md flex-col justify-between px-6 py-16 sm:py-24">
      <header className="flex items-center gap-3">
        <span
          aria-hidden
          className="inline-block size-3 rounded-full bg-brand-500"
        />
        <span className="text-sm tracking-widest text-ink-secondary uppercase">
          LevelUp Kids
        </span>
      </header>

      <section className="flex flex-1 flex-col justify-center gap-8 py-16">
        <h1
          className="font-display text-balance"
          style={{
            fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif",
            fontSize: "var(--text-display)",
            lineHeight: 1.05,
            letterSpacing: "-0.01em",
          }}
        >
          Raise the kind of adult you actually want to raise.
        </h1>

        <p className="max-w-xl text-lg text-ink-secondary">
          A family operating system built around eight pillars — scholar,
          athlete, builder, creator, leader, character, explorer, purpose.
          Daily quests your kid actually wants to do. A Family Growth Score
          that tells the truth.
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/auth/signup"
            className="rounded-md bg-brand-500 px-5 py-3 text-base font-medium text-white transition hover:bg-brand-600"
          >
            Start with your family
          </Link>
          <Link
            href="/auth/signin"
            className="text-sm text-ink-secondary underline-offset-4 hover:underline"
          >
            Already have an account
          </Link>
        </div>
      </section>

      <footer className="flex flex-col gap-2 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between">
        <span>Mobile-first. Cream, ink, terracotta. Built for parents.</span>
        <span aria-hidden>
          {new Date().getFullYear()} &middot; LevelUp Kids
        </span>
      </footer>
    </main>
  );
}
