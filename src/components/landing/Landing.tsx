import Link from "next/link";
import { PILLARS } from "@/lib/types/pillar";
import { PILLAR_COPY } from "@/lib/pillars/copy";

const PILLAR_EMOJI: Record<string, string> = {
  scholar: "📚",
  athlete: "⚽",
  builder: "🔨",
  creator: "🎨",
  leader: "🏅",
  character: "🌟",
  explorer: "🧭",
  purpose: "🤝",
};

export function Landing() {
  return (
    <div
      className="min-h-dvh"
      style={{
        background:
          "radial-gradient(120% 60% at 50% -10%, color-mix(in srgb, var(--brand-500) 14%, var(--surface-paper)) 0%, var(--surface-paper) 55%)",
      }}
    >
      {/* nav */}
      <nav className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="inline-flex size-10 items-center justify-center rounded-2xl bg-brand-500 font-bold text-white shadow-md"
            style={{
              fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif",
              fontSize: "1.4rem",
              letterSpacing: "-0.02em",
            }}
          >
            L
          </span>
          <span className="text-lg font-bold text-ink-primary">
            LevelUp Kids
          </span>
        </Link>
        <Link
          href="/auth/signin"
          className="text-base font-semibold text-ink-secondary underline-offset-4 hover:text-brand-600 hover:underline"
        >
          Sign in
        </Link>
      </nav>

      {/* hero */}
      <main className="mx-auto max-w-screen-xl px-6 pt-6 pb-16 sm:px-8 sm:pt-12">
        <section className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div className="flex flex-col gap-8">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-brand-50 px-4 py-2 text-sm font-bold text-brand-600">
              <span aria-hidden>✨</span>
              The family OS for raising great kids
            </span>
            <h1
              className="font-display text-balance"
              style={{
                fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif",
                fontSize: "clamp(44px, 8vw, 88px)",
                lineHeight: 0.98,
                letterSpacing: "-0.03em",
              }}
            >
              Raise the kind of adult you actually want to raise.
            </h1>
            <p className="max-w-xl text-xl text-ink-secondary sm:text-2xl">
              Daily quests your kids actually want to do — across the eight
              things every thriving kid needs. Watch them level up. Forward the
              screenshot.
            </p>
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <Link href="/auth/signup" className="btn-huge sm:w-auto">
                Start with your family →
              </Link>
              <p className="text-base text-ink-muted sm:ml-2">
                Free for your first family. No credit card.
              </p>
            </div>
          </div>

          {/* hero visual — mock child card to show the product */}
          <HeroMockCard />
        </section>

        {/* eight pillars */}
        <section className="mt-24">
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-base font-bold tracking-wide text-brand-600 uppercase">
              The eight pillars
            </p>
            <h2
              className="font-display"
              style={{
                fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif",
                fontSize: "clamp(32px, 5vw, 48px)",
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
              }}
            >
              Every dimension of a thriving kid.
            </h2>
            <p className="mt-1 max-w-xl text-lg text-ink-secondary">
              Each kid picks 2 or 3 this month. Adjust whenever they level up
              or whenever your family does.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PILLARS.map((p) => {
              const copy = PILLAR_COPY[p];
              return (
                <div
                  key={p}
                  className="flex flex-col items-start gap-3 rounded-3xl p-5 shadow-md transition-transform hover:-translate-y-0.5"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${copy.tint} 8%, var(--surface-card))`,
                  }}
                >
                  <span
                    className="flex size-12 items-center justify-center rounded-2xl text-2xl"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${copy.tint} 22%, var(--surface-paper))`,
                    }}
                    aria-hidden
                  >
                    {PILLAR_EMOJI[p] ?? "✨"}
                  </span>
                  <h3
                    className="font-display"
                    style={{
                      fontFamily:
                        "var(--font-fraunces), ui-serif, Georgia, serif",
                      fontSize: "1.5rem",
                      color: copy.tint,
                      letterSpacing: "-0.015em",
                    }}
                  >
                    {copy.title}
                  </h3>
                </div>
              );
            })}
          </div>
        </section>

        {/* how it works */}
        <section className="mt-24">
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-base font-bold tracking-wide text-brand-600 uppercase">
              How it works
            </p>
            <h2
              className="font-display"
              style={{
                fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif",
                fontSize: "clamp(32px, 5vw, 48px)",
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
              }}
            >
              Three taps from setup to streak.
            </h2>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            <HowStep
              num={1}
              title="Set up your family"
              body="Name your household. Add your kids. Pick each kid's 2 or 3 pillars for the month. Two minutes, tops."
            />
            <HowStep
              num={2}
              title="Daily quests show up"
              body="Three quests per kid, every day, mapped to your focus pillars and their age. Kids tap 'I did it.' You approve from your phone."
            />
            <HowStep
              num={3}
              title="Watch them level up"
              body="XP, levels, streaks, and one Family Growth Score that tells the truth. Put it on a kitchen iPad for the whole family to see."
            />
          </div>
        </section>

        {/* cta */}
        <section
          className="mt-24 flex flex-col items-center gap-6 rounded-3xl px-6 py-14 text-center shadow-lg sm:px-12 sm:py-20"
          style={{
            background:
              "linear-gradient(140deg, var(--brand-500) 0%, var(--brand-600) 100%)",
          }}
        >
          <h2
            className="font-display text-balance text-white"
            style={{
              fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif",
              fontSize: "clamp(36px, 6vw, 64px)",
              lineHeight: 1.05,
              letterSpacing: "-0.025em",
            }}
          >
            Start your family&apos;s first quest tonight.
          </h2>
          <p className="max-w-xl text-lg text-white/85 sm:text-xl">
            Sign up with one email. Magic link, no password. Your kids will
            have today&apos;s quests within 60 seconds.
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-5 text-lg font-bold text-brand-600 shadow-lg transition-all hover:-translate-y-0.5"
          >
            Start with your family
            <span aria-hidden>→</span>
          </Link>
        </section>

        <footer className="mt-16 flex flex-col gap-2 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <span>Mobile-first. Built for parents. No ads, ever.</span>
          <span aria-hidden>
            {new Date().getFullYear()} &middot; LevelUp Kids
          </span>
        </footer>
      </main>
    </div>
  );
}

function HowStep({
  num,
  title,
  body,
}: {
  num: number;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-card p-6 shadow-md">
      <span
        className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 font-bold text-brand-600"
        style={{
          fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif",
          fontSize: "1.5rem",
        }}
      >
        {num}
      </span>
      <h3
        className="font-display"
        style={{
          fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif",
          fontSize: "1.5rem",
          letterSpacing: "-0.015em",
        }}
      >
        {title}
      </h3>
      <p className="text-base text-ink-secondary">{body}</p>
    </div>
  );
}

function HeroMockCard() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div
        className="rounded-[32px] bg-card p-6 shadow-[0_30px_60px_-20px_rgba(31,27,22,0.25),0_8px_16px_rgba(31,27,22,0.1)] sm:p-8"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 0%, color-mix(in srgb, var(--brand-500) 10%, var(--surface-card)) 0%, var(--surface-card) 60%)",
        }}
      >
        <div className="flex items-center gap-2 text-sm font-bold text-ink-muted">
          <span className="inline-block size-2 rounded-full bg-success" />
          The Aziz Family
        </div>

        <div className="mt-6 flex flex-col items-center gap-4">
          <div className="relative">
            <div
              className="flex size-40 items-center justify-center rounded-full bg-paper text-7xl shadow-md sm:size-48"
              style={{
                boxShadow:
                  "inset 0 0 0 5px color-mix(in srgb, var(--brand-500) 25%, transparent), 0 12px 24px -6px rgba(31, 27, 22, 0.18)",
              }}
              aria-hidden
            >
              🦊
            </div>
            <span
              className="absolute -right-2 -bottom-1 rounded-full bg-brand-500 px-3.5 py-1.5 font-bold text-white shadow-md"
              style={{
                fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif",
                fontSize: "1.25rem",
                letterSpacing: "-0.02em",
              }}
              aria-hidden
            >
              Lvl 6
            </span>
          </div>
          <p
            className="font-display"
            style={{
              fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif",
              fontSize: "2.5rem",
              lineHeight: 1,
              letterSpacing: "-0.02em",
            }}
          >
            Layla
          </p>
          <div className="flex items-center gap-2 rounded-full bg-warning/15 px-3 py-1 text-base font-bold" style={{ color: "var(--warning)" }}>
            <span aria-hidden>🔥</span>
            7-day streak
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-1.5 flex items-baseline justify-between text-sm font-bold">
            <span className="text-ink-secondary">45 XP</span>
            <span className="text-ink-muted">55 more for Lvl 7</span>
          </div>
          <div className="overflow-hidden rounded-full bg-tinted" style={{ height: "14px" }}>
            <div
              className="h-full rounded-full bg-brand-500 transition-all"
              style={{ width: "45%" }}
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <p className="text-base font-bold text-ink-secondary">
            🎉 3 for 3 today
          </p>
          <div className="flex gap-1.5">
            <span
              className="size-5 rounded-full"
              style={{
                backgroundColor: "var(--pillar-scholar)",
                boxShadow: "0 0 0 3px color-mix(in srgb, var(--pillar-scholar) 25%, transparent)",
              }}
              aria-hidden
            />
            <span
              className="size-5 rounded-full"
              style={{
                backgroundColor: "var(--pillar-athlete)",
                boxShadow: "0 0 0 3px color-mix(in srgb, var(--pillar-athlete) 25%, transparent)",
              }}
              aria-hidden
            />
            <span
              className="size-5 rounded-full"
              style={{
                backgroundColor: "var(--pillar-character)",
                boxShadow: "0 0 0 3px color-mix(in srgb, var(--pillar-character) 25%, transparent)",
              }}
              aria-hidden
            />
          </div>
        </div>
      </div>

      {/* floating +5 XP pip */}
      <div
        className="absolute -top-3 -right-3 rotate-3 rounded-full bg-success px-4 py-2 text-base font-bold text-white shadow-lg sm:-top-4 sm:-right-6 sm:text-lg"
        aria-hidden
      >
        +5 XP
      </div>
      {/* floating pillar chip */}
      <div
        className="absolute -bottom-2 -left-3 -rotate-3 rounded-full px-4 py-2 text-sm font-bold text-white shadow-lg sm:-bottom-4 sm:-left-6"
        style={{ backgroundColor: "var(--pillar-scholar)" }}
        aria-hidden
      >
        📚 Scholar
      </div>
    </div>
  );
}
