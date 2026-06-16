# Architecture — LevelUp Kids v1.0

Technical reference for the autonomous agents and any human reading the code. The PRD says *what*; this file says *how*.

## 1. Stack at a glance

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) | Server actions for mutations, RSC for the parent dashboard, edge-cacheable landing page |
| Language | TypeScript (strict) | Catches the schema-vs-UI drift the AI agents will otherwise generate |
| Styling | Tailwind v4 + shadcn/ui | shadcn primitives are unstyled; we layer the LevelUp Kids design system on top |
| Database | Supabase Postgres | Auth + storage + RLS + realtime in one |
| Auth | Supabase Auth (magic link) | No passwords on parents; child has no login in v1 |
| AI client | `src/lib/ai/client.ts` (a single `callAI()` boundary) | Routes Anthropic → OpenAI fallback. v1.0 has the boundary; the actual AI Coach is a v1.1 ticket |
| Payments | Stripe (lazy `getStripe()`) — wired in v1.1 | The schema reserves `households.subscription_tier` |
| Push | OneSignal — wired in v1.1 | |
| Analytics | Internal `events` table in v1.0; PostHog in v1.1 | We capture events from day 1 so v1.1 has history |
| Hosting | Vercel | Branch protection + auto-deploy on push to `main` |
| Shape | PWA (manifest + service worker) | Installable iOS + Android |

## 2. Repository layout

```
src/
├── app/
│   ├── (marketing)/                 ← public landing
│   │   └── page.tsx
│   ├── auth/
│   │   ├── signin/page.tsx
│   │   ├── signup/page.tsx
│   │   └── callback/route.ts        ← Supabase magic-link callback
│   ├── onboarding/
│   │   ├── household/page.tsx
│   │   ├── children/page.tsx
│   │   └── pillars/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx               ← parent-side shell, requires auth
│   │   ├── page.tsx                 ← parent dashboard
│   │   ├── household/page.tsx
│   │   ├── settings/page.tsx
│   │   └── kids/[childId]/
│   │       ├── page.tsx             ← child dashboard
│   │       └── quests/[questId]/page.tsx
│   └── api/
│       ├── quests/seed/route.ts     ← server-side seed for the first week
│       ├── quests/complete/route.ts ← child marks ready
│       ├── quests/approve/route.ts  ← parent approves
│       └── events/route.ts          ← internal event log
├── components/
│   ├── ui/                          ← shadcn primitives
│   ├── pillars/                     ← PillarBadge, PillarIcon, PillarTint
│   ├── quests/                      ← QuestCard, QuestApprovalRow
│   ├── xp/                          ← XpRing, LevelBadge, StreakChip
│   ├── growth/                      ← FamilyGrowthRadar, ScoreBadge
│   └── shell/                       ← TopBar, BottomNav (mobile), Sidebar (desktop)
├── lib/
│   ├── supabase/
│   │   ├── server.ts                ← createServiceSupabase() — server only
│   │   ├── browser.ts               ← createBrowserSupabase() — auth-only on client
│   │   └── middleware.ts            ← Next middleware: public paths allow-list
│   ├── ai/
│   │   ├── client.ts                ← callAI() / callAIWithJSON() — multi-provider
│   │   └── prompts.ts               ← (stubbed in v1.0; populated in v1.1)
│   ├── quests/
│   │   ├── seed-library.ts          ← hand-written quest templates (v1.0)
│   │   ├── selector.ts              ← given (child, focus_pillars, age) → 3 daily + 1 weekly
│   │   └── xp-rules.ts              ← award rules + difficulty multipliers
│   ├── growth/
│   │   ├── score.ts                 ← Family Growth Score formula
│   │   └── level.ts                 ← floor(totalXp / 100)
│   ├── api.ts                       ← client query()/mutate() — server actions wrap this
│   ├── events.ts                    ← event(name, props) → events table (server)
│   └── types/database.ts            ← generated from supabase
├── hooks/
│   ├── use-household.ts
│   ├── use-children.ts
│   ├── use-child-quests.ts
│   └── use-growth-score.ts
└── styles/
    ├── tokens.css                   ← CSS variables (color, type, space)
    └── globals.css                  ← Tailwind + tokens

supabase/
├── migrations/
│   ├── 0001_init.sql                ← households, parents, children, quests, quest_completions
│   ├── 0002_events.sql              ← internal events table
│   └── 0003_seed_quest_templates.sql ← writes the v1 hand-curated quest library
├── seed.sql                         ← E2E fixture
└── config.toml

tests/                               ← vitest
e2e/                                 ← Playwright (chromium + mobile-webkit)
.github/workflows/ci.yml             ← lint + unit-tests + e2e-tests
public/
├── manifest.webmanifest             ← PWA
├── sw.js                            ← service worker (cache-first for shell, network for API)
└── avatars/                         ← 12 shipped avatars
```

## 3. Database schema (v1.0)

The canonical SQL lives in `supabase/migrations/0001_init.sql`. The contract:

```sql
-- households
create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subscription_tier text not null default 'free' check (subscription_tier in ('free', 'premium')),
  focus_pillars text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- parents (Supabase Auth user mapped to a household)
create table parents (
  id uuid primary key,                   -- matches auth.users.id
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null default 'parent' check (role in ('admin', 'parent')),
  created_at timestamptz not null default now()
);

-- children (no auth row in v1)
create table children (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  age int not null check (age between 4 and 17),
  avatar text not null,                  -- key into public/avatars/
  created_at timestamptz not null default now()
);

-- quest templates (the seed library)
create table quest_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  pillar text not null check (pillar in (
    'scholar','athlete','builder','creator','leader','character','explorer','purpose'
  )),
  type text not null check (type in ('daily','weekly','monthly')),
  difficulty int not null default 1 check (difficulty between 1 and 3),
  xp_reward int not null,
  min_age int not null default 4,
  max_age int not null default 17
);

-- quests assigned to a specific child (a denormalized snapshot of the template
-- so the child's history is stable when we re-seed)
create table quests (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  template_id uuid references quest_templates(id),
  title text not null,
  description text not null,
  pillar text not null,
  type text not null check (type in ('daily','weekly','monthly')),
  difficulty int not null default 1,
  xp_reward int not null,
  assigned_for date not null,            -- the day (daily) or week-start (weekly) it applies to
  created_at timestamptz not null default now()
);

-- completions (system-of-record for XP)
create table quest_completions (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references quests(id) on delete cascade,
  child_id uuid not null references children(id) on delete cascade,
  completed_at timestamptz not null default now(),         -- when child tapped "I did it"
  approved_by uuid references parents(id),                  -- null until parent confirms
  approved_at timestamptz,
  xp_awarded int not null default 0,                        -- 0 until approved; immutable after
  unique (quest_id)                                         -- one completion per quest
);

-- events (internal analytics; PostHog reads this in v1.1)
create table events (
  id bigserial primary key,
  household_id uuid references households(id) on delete set null,
  parent_id uuid references parents(id) on delete set null,
  child_id uuid references children(id) on delete set null,
  name text not null,
  props jsonb not null default '{}',
  created_at timestamptz not null default now()
);
```

### Row-Level Security

RLS is on for every table. The contract:

- A `parent` can read everything in their household (`household_id = (select household_id from parents where id = auth.uid())`).
- A `parent` can write to `children`, `quests`, `quest_completions` for their household.
- Service-role bypasses RLS for server-side seed jobs (`/api/quests/seed`) and for the events writer.
- Children have no auth row in v1.0 — the parent's session is the trust boundary. The child view runs under the parent's identity.

## 4. Key algorithms

### 4.1 Level

```ts
export const level = (totalXp: number): number => Math.floor(totalXp / 100);
export const xpToNextLevel = (totalXp: number): number => 100 - (totalXp % 100);
```

That's it. No table, no curve, no soft-cap. The simplicity is the feature.

### 4.2 Family Growth Score

Per pillar, on the trailing **28 days**:

```
score = round(70 * completion_rate + 30 * consistency)
where
  completion_rate = approved_completions_in_pillar / expected_completions_in_pillar
  expected = (3 daily quests per child per day in focus * 28 / 8 pillars-in-focus)  if pillar in focus
           = 0  if pillar not in focus  (the score is N/A; UI hides non-focus pillars)
  consistency = days_in_28_with_at_least_one_completion_in_pillar / 28
```

`completion_rate` is capped at 1.0. A family that triples up on one pillar can max it; bonus XP doesn't break the score. The radar chart shows all 8 pillars but greys out the non-focus ones with the copy "not in focus this season."

### 4.3 Quest seeding (v1.0 — rule-based)

`src/lib/quests/selector.ts` is the v1 brain:

```ts
seedFirstWeek({ childId, age, focusPillars }) → {
  daily: QuestTemplate[],   // 7 days × 3 quests/day = 21 quests
  weekly: QuestTemplate[],  // 1 quest for the week
}

// Rules:
// 1. Each focus pillar gets at least 1 quest every day.
// 2. The 3rd daily slot rotates through the focus pillars (round-robin per day).
// 3. The weekly mission is randomly drawn from the focus pillars, difficulty 2-3.
// 4. Filter templates by age (min_age, max_age) and seen-recently (no duplicate within 7 days).
```

When v1.1 wires the AI Coach, `selector.ts` becomes a fallback; the AI Coach proposes quests and the selector validates them against the same rules.

## 5. AI client boundary (the v1.0 stub)

`src/lib/ai/client.ts` ships with the multi-provider shape in place but no production callers:

```ts
export async function callAI({ system, messages, household, fallback = true }) { ... }
export async function callAIWithJSON({ system, messages, schema, household }) { ... }
```

- Routes Anthropic → OpenAI on failure (configurable per `household`).
- Every call writes to a server-side log so v1.1 has cost telemetry from day 1.
- In v1.0 the only caller is a stubbed "what would the AI coach say?" preview button in the parent dashboard, gated behind `process.env.NEXT_PUBLIC_AI_PREVIEW === '1'` (off by default; on in dev).

The point: the seam is in v1.0 so the AI Coach ticket in v1.1 doesn't refactor half the codebase.

## 6. CI + gating

`.github/workflows/ci.yml` (written by ticket 0001) runs three jobs:

| Job | What it does | Required check name |
|---|---|---|
| `lint` | `npm run lint && node scripts/check-backlog.mjs` | `lint` |
| `unit-tests` | `npx tsc --noEmit && npx vitest run` | `unit-tests` |
| `e2e-tests` | `supabase start` + seed + `npm run build` + `npx playwright test` (chromium + mobile-webkit projects) | `e2e-tests` |

Branch protection on `main` requires exactly these three. Vercel preview deploys, the PR-comment bot, and any future nightly job are informational and MUST be ignored by the review agent.

The backlog validator (`scripts/check-backlog.mjs`) lives inside `lint` so a ticket that drifts from the README index fails CI immediately.

## 7. Non-negotiables (the architecture-level Hard NOs)

These are encoded in `AGENTS.md` but live here too because they're architecture, not policy:

1. **No new top-level dependency without an authorizing ticket line.** A surprise dep bump is a reject.
2. **No client-side Supabase reads / writes.** Use the `query()` / `mutate()` helpers in `src/lib/api.ts`. Only `supabase.auth.*` runs on the client.
3. **No new field on `children` without explicit ticket approval.** We collect the minimum on minors and stay there.
4. **No third-party SDK that fires on page load** (analytics, error reporters, A/B testers) in v1.0. The internal `events` table is the only telemetry.
5. **No `import Anthropic from '@anthropic-ai/sdk'` outside `src/lib/ai/`.** The boundary is the boundary.
6. **No Stripe code in v1.0.** Schema reserves the column; routes land in the v1.1 Stripe ticket.

## 8. Performance budgets

- **Landing page** — LCP < 1.8s on 4G iPhone 12. The landing page is server-rendered, statically cached at the edge.
- **Parent dashboard** — TTI < 2.5s on the same device when signed in. RSC for the data layer; one round-trip to Supabase.
- **Child dashboard** — TTI < 2.0s. The child is a kid with low patience; this matters.
- **Service worker** — caches the app shell, network-first for `/api/*`. Offline opens the cached shell and shows a "you're offline — your quest will sync" banner.

## 9. What the autonomous agents will build, in what order

The backlog (`docs/backlog/`) is the canonical order. The architecture-level summary:

1. **0001** — scaffold Next.js + Tailwind + shadcn + Supabase local + CI.
2. **0002** — migrations `0001_init.sql` + RLS policies + Supabase types.
3. **0003–0007** — auth + onboarding (household, children, pillars).
4. **0008–0011** — quest engine (templates, selector, completion, approval).
5. **0012** — XP + level derivation + child XP ring.
6. **0013** — Family Growth Score + radar chart.
7. **0014** — parent dashboard.
8. **0015** — child dashboard.
9. **0016** — quest detail page.
10. **0017** — PWA manifest + service worker + install prompt.
11. **0018** — mobile-first polish + desktop responsive QA.

Tickets 0019+ are v1.1 (proposed status) — the gtm-innovation agent grooms them after v1.0 ships.
