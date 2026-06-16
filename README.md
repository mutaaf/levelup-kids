# LevelUp Kids

A mobile-first Family Development Platform that helps parents intentionally develop children across eight dimensions through gamified daily experiences.

Think: Duolingo for raising kids. Fitbit for personal development. A Family Operating System.

The product does **not** track chores, grades, or screen time. It builds **curious, confident, capable, creative, faithful, healthy, kind, resilient** children through a structured Quest → XP → Level → Family Growth Score loop.

## Eight pillars

`scholar · athlete · builder · creator · leader · character · explorer · purpose`

## Status

Pre-code. Planning and autonomous-agent infrastructure are in place; the build is delegated to the agent fleet (`gtm-innovation`, `implementation-dev`, `review`, `eng-dev`) reading from `docs/backlog/`.

## Repo map

```
levelup-kids/
├── README.md                 ← you are here
├── CLAUDE.md                 ← agent quick-reference (architecture cheatsheet)
├── AGENTS.md                 ← contract for autonomous agents (read every run)
├── agents.config.sh          ← fleet manifest (plumbing only)
├── docs/
│   ├── PRD.md                ← product requirements (the why + the what)
│   ├── ARCHITECTURE.md       ← technical architecture
│   ├── DESIGN.md             ← visual system, voice, components
│   ├── GTM.md                ← go-to-market plan
│   ├── ROADMAP.md            ← v1.0 (6-week core) → v1.1 → v2
│   ├── LESSONS.md            ← append-only operational memory (agents write here)
│   └── backlog/
│       ├── README.md         ← index + conventions
│       ├── _template.md      ← starting point for new tickets
│       └── NNNN-*.md         ← one file per ticket
├── scripts/
│   └── check-backlog.mjs     ← deterministic integrity check (gates CI)
└── .claude/
    └── agents/
        ├── implementation-dev.md  ← test-first feature shipper
        ├── gtm-innovation.md      ← writes tickets, never code
        ├── review.md              ← grades PRs against AGENTS.md
        └── eng-dev.md             ← engineering hygiene (off by default)
```

## Stack

- **Frontend** — Next.js 15 (App Router), React, TypeScript, Tailwind, shadcn/ui
- **Backend** — Supabase (Postgres + Auth + Storage + RLS)
- **AI** — Anthropic Claude API (primary) with OpenAI fallback via a single `callAI()` boundary
- **Payments** — Stripe (deferred to v1.1)
- **Analytics** — PostHog (deferred to v1.1)
- **Push** — OneSignal (deferred to v1.1)
- **Hosting** — Vercel
- **Shape** — PWA (installable iOS + Android, mobile-first, responsive desktop)

## Six-week core loop (v1.0)

The MVP that proves engagement before adding monetization:

| Week | Focus |
|---|---|
| 1 | Auth, household, multi-parent invite, child setup |
| 2–3 | Quest engine: data model, daily quests, weekly missions, approval flow |
| 4 | XP, levels, Family Growth Score |
| 5 | Parent dashboard, child dashboard |
| 6 | PWA install + mobile polish + launch to 10 families |

v1.1 (agents pick up after launch): AI Family Coach, Achievements, Stripe subscriptions, OneSignal push, PostHog analytics. See `docs/ROADMAP.md`.

## Local development

Requirements: **Node 20.19+** (engines pin in `package.json`; cross-fleet lessons rule
out Node 25 for vitest 4 + vite 8), the **Supabase CLI**, and **Docker** running for
`supabase start`.

```bash
npm install
cp .env.example .env.local
supabase start                  # local Postgres + Auth on :54321 / :54322
supabase status -o env \
  --override-name api.url=NEXT_PUBLIC_SUPABASE_URL \
  --override-name auth.anon_key=NEXT_PUBLIC_SUPABASE_ANON_KEY \
  --override-name auth.service_role_key=SUPABASE_SERVICE_ROLE_KEY \
  --override-name db.url=SUPABASE_DB_URL >> .env.local

npm run dev                     # http://localhost:3000

# the local gate (also enforced in CI as three named jobs):
npm run lint                    # ESLint + node scripts/check-backlog.mjs
npm run typecheck               # tsc --noEmit
npm run test                    # vitest
npm run test:e2e                # Playwright (chromium + mobile-webkit)
```

## Going autonomous

Once 0001 has shipped and the repo is on GitHub with branch protection:

```bash
bash ../agent-fleet/lib/install.sh /Users/mutaafaziz/Desktop/projects/levelup-kids
```

The launchd jobs `com.levelup-kids.agent-{ship,groom,review,eng}` will then run on the schedule defined in `agents.config.sh`. Watch their status from any device via the fleet-control portal (`http://127.0.0.1:7070`).
