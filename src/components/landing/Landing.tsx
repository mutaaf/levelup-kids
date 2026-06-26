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
              Pick 2 or 3 to focus on this season. Change them whenever your
              family changes.
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

        {/* development arc — concrete behavior changes, not vague benefits */}
        <DevelopmentArc />

        {/* sample real quests across pillars */}
        <SampleQuests />

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
              body="Name your household. Add your kids. Pick 2 or 3 pillars you want to focus on this season. Two minutes, tops."
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

        {/* honest band — what this is NOT, because differentiation matters */}
        <NotWhatThisIs />

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

// "What changes" — three concrete behavioral snapshots. Avoid vague
// promises ("a happier kid!") and stick to specific, observable shifts.
function DevelopmentArc() {
  const frames = [
    {
      label: "Week 1",
      caption: "First quest tonight",
      points: [
        "One quest per kid per pillar",
        "Kid taps Done, you tap Approve",
        "Awkward at first — that's fine",
      ],
      tint: "var(--pillar-scholar)",
    },
    {
      label: "Week 4",
      caption: "Habit forming",
      points: [
        "First 🔥 7-day streak",
        "First badge earned — kid shows the whole family",
        "Kid asks YOU about quests instead of vice versa",
      ],
      tint: "var(--pillar-character)",
    },
    {
      label: "Week 12",
      caption: "Visible change",
      points: [
        "Radar fills out across all focus pillars",
        "Mornings are calmer — quests replace nagging",
        "Family Growth Score becomes a Sunday-night ritual",
      ],
      tint: "var(--pillar-purpose)",
    },
  ];

  return (
    <section className="mt-24">
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-base font-bold tracking-wide text-brand-600 uppercase">
          What actually changes
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
          Three months in, you can see it.
        </h2>
        <p className="mt-1 max-w-xl text-lg text-ink-secondary">
          The change isn&apos;t a personality transplant. It&apos;s the small
          shifts that compound: one habit, one streak, one Sunday-night recap
          at a time.
        </p>
      </div>
      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        {frames.map((f) => (
          <article
            key={f.label}
            className="relative flex flex-col gap-4 rounded-3xl bg-card p-6 shadow-md transition-transform hover:-translate-y-0.5"
          >
            <div
              aria-hidden
              className="absolute top-0 left-0 h-full w-1.5 rounded-l-3xl"
              style={{ backgroundColor: f.tint }}
            />
            <div className="flex items-baseline justify-between">
              <span
                className="text-sm font-bold tracking-wide uppercase"
                style={{ color: f.tint }}
              >
                {f.label}
              </span>
              <span className="text-sm font-semibold text-ink-muted">
                {f.caption}
              </span>
            </div>
            <ul className="flex flex-col gap-2.5">
              {f.points.map((p) => (
                <li
                  key={p}
                  className="flex items-start gap-2.5 text-base text-ink-primary"
                >
                  <span
                    aria-hidden
                    className="mt-2 inline-block size-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: f.tint }}
                  />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

// Real quests, hand-picked from the seed library so visitors see exactly
// what their kids will tap on. Six samples across the eight pillars.
function SampleQuests() {
  const samples = [
    { pillar: "scholar", title: "Read for 20 minutes", xp: 15, age: "8-11" },
    { pillar: "athlete", title: "15 minutes outside", xp: 15, age: "8-11" },
    { pillar: "character", title: "Tell a parent one true thing", xp: 10, age: "all" },
    { pillar: "purpose", title: "Give something away that's still good", xp: 20, age: "8-11" },
    { pillar: "creator", title: "Make something that didn't exist this morning", xp: 15, age: "8-11" },
    { pillar: "explorer", title: "Look up something you wonder about", xp: 10, age: "8-11" },
  ] as const;

  return (
    <section className="mt-24">
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-base font-bold tracking-wide text-brand-600 uppercase">
          A real day of quests
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
          Specific. Doable. No screens required.
        </h2>
        <p className="mt-1 max-w-xl text-lg text-ink-secondary">
          A few of the 60+ hand-written templates. Age-targeted, pillar-coded,
          short enough that a 9-year-old will actually do them.
        </p>
      </div>
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {samples.map((q) => {
          const copy = PILLAR_COPY[q.pillar];
          return (
            <article
              key={q.title}
              className="relative flex flex-col gap-3 rounded-3xl bg-card p-5 shadow-md"
            >
              <div
                aria-hidden
                className="absolute top-0 left-0 h-full w-1.5 rounded-l-3xl"
                style={{ backgroundColor: copy.tint }}
              />
              <header className="flex items-center justify-between">
                <span
                  className="rounded-full px-3 py-1 text-xs font-bold text-white"
                  style={{ backgroundColor: copy.tint }}
                >
                  {copy.title}
                </span>
                <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-600">
                  +{q.xp} XP
                </span>
              </header>
              <p className="text-lg font-semibold text-ink-primary">
                {q.title}
              </p>
              <p className="text-sm text-ink-muted">Ages {q.age}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

// Honest band — say what we're NOT so visitors who want those things
// self-select out instead of churning later.
function NotWhatThisIs() {
  return (
    <section className="mt-24">
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-base font-bold tracking-wide text-brand-600 uppercase">
          What this is not
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
          We&apos;re honest about the boundaries.
        </h2>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {[
          {
            no: "A kid app with infinite scroll",
            yes: "A parent tool with brief kid moments. The kid taps Done, then puts the phone down.",
          },
          {
            no: "A behavior tracker for shaming kids",
            yes: "An XP system that celebrates effort. Skipped days are normal. No streaks-as-pressure.",
          },
          {
            no: "Therapy, coaching, or medical advice",
            yes: "A daily ritual layer. The Family Coach gives nudges, not diagnoses.",
          },
          {
            no: "A data product harvesting your kids",
            yes: "First name, age, avatar, XP. No last name, no school, no photos, no location.",
          },
        ].map((row) => (
          <article
            key={row.no}
            className="flex flex-col gap-3 rounded-3xl bg-card p-6 shadow-md"
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-danger/15 font-bold text-danger"
              >
                ×
              </span>
              <p className="text-base font-semibold text-ink-primary">
                {row.no}
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-success/15 font-bold text-success"
              >
                ✓
              </span>
              <p className="text-base text-ink-secondary">{row.yes}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
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
            Zara
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
