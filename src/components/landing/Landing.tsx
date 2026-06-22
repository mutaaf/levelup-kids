import Link from "next/link";

export function Landing() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-screen-md flex-col justify-between px-6 py-12 sm:py-20">
      <header className="flex items-center gap-3">
        <span
          aria-hidden
          className="inline-flex size-9 items-center justify-center rounded-2xl bg-brand-500 font-bold text-white shadow-md"
          style={{
            fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif",
            fontSize: "1.2rem",
            letterSpacing: "-0.02em",
          }}
        >
          L
        </span>
        <span className="text-lg font-bold text-ink-primary">
          LevelUp Kids
        </span>
      </header>

      <section className="flex flex-1 flex-col justify-center gap-8 py-16">
        <h1
          className="font-display text-balance"
          style={{
            fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif",
            fontSize: "var(--text-display)",
            lineHeight: 1.02,
            letterSpacing: "-0.025em",
          }}
        >
          Raise the kind of adult you actually want to raise.
        </h1>

        <p className="max-w-xl text-xl text-ink-secondary">
          Daily quests your kids actually want to do — across the eight things
          a thriving kid needs. Watch them level up. Forward the screenshot.
        </p>

        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <Link href="/auth/signup" className="btn-huge sm:w-auto">
            Start with your family
          </Link>
          <Link
            href="/auth/signin"
            className="text-center text-base font-medium text-ink-secondary underline-offset-4 hover:underline sm:ml-2"
          >
            Already have an account
          </Link>
        </div>
      </section>

      <footer className="flex flex-col gap-2 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between">
        <span>Mobile-first. Built for parents. No ads ever.</span>
        <span aria-hidden>
          {new Date().getFullYear()} &middot; LevelUp Kids
        </span>
      </footer>
    </main>
  );
}
