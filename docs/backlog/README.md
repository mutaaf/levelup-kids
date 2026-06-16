# Backlog

The single source of truth for what gets built next. Owned jointly by the **gtm-innovation** subagent (writes tickets) and the **implementation-dev** subagent (ships them).

## How it works

1. **Ideate** — `/ideate` (or `@gtm-innovation`) generates new tickets and drops them in this directory as `NNNN-kebab-title.md`.
2. **Groom** — `/groom` re-prioritizes existing tickets, rewrites vague ones, prunes the no-longer-worth-doing.
3. **Ship** — `/ship` (or `/ship 0003`) picks the top-priority groomed ticket, opens a branch, writes the test first, ships it through CI, opens a PR.

The PR merges only when the gating CI checks pass (see `AGENTS.md § Agent parameters`).

## Ticket conventions

Every ticket lives in its own file named `NNNN-kebab-title.md` where `NNNN` is a zero-padded incrementing id. Use `_template.md` as the starting point — copy it, don't edit it.

**Frontmatter is required:**

```yaml
---
id: 0007
title: Pick focus pillars during onboarding
status: groomed     # proposed | groomed | in-progress | shipped | rejected | needs-discovery
priority: P0        # P0 (do now) | P1 (next sprint) | P2 (someday-maybe) | P3 (icebox)
area: onboarding    # see Areas below
created: 2026-06-16
owner: gtm-innovation
---
```

**Body must include:**
1. **User story** — persona + behavior + outcome.
2. **Why now (four lenses)** — Product Owner, Stakeholder, User, Growth.
3. **Acceptance criteria** — checkbox list mapping 1:1 to vitest or Playwright test scenarios.
4. **Out of scope** — explicit anti-goals.
5. **Engineering notes** — files to touch, dependencies, hard constraints.
6. **Implementation log** — appended by the dev agent during execution.

## Priorities

- **P0** — ships this week. Either user-visible breakage, a security / privacy / billing issue, or a wedge a sibling ticket depends on.
- **P1** — ships next. The next compounding lever (a real feature, a meaningful UX leap, a moat-deepener).
- **P2** — someday-maybe. Good ideas waiting for context. Most tickets sit here.
- **P3** — icebox. Don't ship without a fresh `/groom` pass first.

## Statuses

- `proposed` — written by gtm-innovation, not yet validated for execution.
- `groomed` — validated; acceptance criteria are test-shaped; ready for dev to pick up.
- `in-progress` — a feature branch + PR is open against it.
- `shipped` — merged on `main`. Keep the file for traceability.
- `rejected` — closed without shipping. Body explains why.
- `needs-discovery` — too vague; needs a `/groom` rewrite or human conversation.

## Areas

Used in frontmatter `area:` field. Keep it short and scoped:

- `infra` — scaffolding, CI, dev ergonomics, deployment
- `auth` — Supabase Auth, sign-up, sign-in, session
- `household` — household creation, multi-parent, household profile
- `children` — child profile, age, avatar
- `onboarding` — the end-to-end first-10-minutes flow
- `pillars` — focus pillar selection, pillar copy, pillar UI
- `quests` — quest templates, selector, daily / weekly / monthly
- `xp` — XP awarding, level derivation, XP ring
- `growth` — Family Growth Score, radar chart
- `dashboard` — parent dashboard, child dashboard
- `pwa` — manifest, service worker, install
- `ai` — anything routed through `callAI()` / prompts / Family Coach
- `billing` — Stripe, subscriptions, premium gating (v1.1)
- `privacy` — COPPA-safe collection, data retention, deletion
- `analytics` — internal events table, PostHog wiring (v1.1)
- `growth-loop` — referral, sharing, weekly recap, seasonal campaigns (v1.1+)
- `design` — design system, illustrations, motion, voice, copy
- `notifications` — OneSignal push, transactional email (v1.1)

## Hand-off discipline

gtm-innovation never edits `src/`, `tests/`, `e2e/`, or `supabase/migrations/`. implementation-dev never invents acceptance criteria the ticket doesn't already have — if the ticket is unclear, the dev pushes back via the ticket's body, not by improvising.

## Index (top of the stack, by priority)

> Updated by `/groom`. This table is the truth about ordering; ignore filesystem ordering.
> Sorted by status (in-progress > groomed > proposed > needs-discovery > shipped > rejected), then priority (P0 > P1 > P2 > P3), then id ascending.

| id | title | priority | status | area |
|----|-------|----------|--------|------|
| 0001 | Scaffold Next.js 15 + Tailwind + shadcn + Supabase local + CI gating | P0 | in-progress | infra |
| 0002 | Postgres schema + RLS for households, parents, children, quests, completions, events | P0 | groomed | infra |
| 0003 | Parent sign-up + sign-in via Supabase Auth magic link | P0 | groomed | auth |
| 0004 | Household creation flow at /onboarding/household | P0 | groomed | onboarding |
| 0005 | Invite a co-parent via email link | P0 | groomed | household |
| 0006 | Add 1-3 children at /onboarding/children with age + avatar | P0 | groomed | onboarding |
| 0007 | Pick 2-3 focus pillars at /onboarding/pillars | P0 | groomed | onboarding |
| 0008 | Quest template seed library across the 8 pillars and 3 age bands | P0 | groomed | quests |
| 0009 | Rule-based quest selector seeds the first week on household creation | P0 | groomed | quests |
| 0010 | Weekly mission selector seeds one mission per child per focus pillar rotation | P1 | groomed | quests |
| 0011 | Child marks quest ready and parent approves from the dashboard queue | P0 | groomed | quests |
| 0012 | XP awarded on approval, level derived as floor(totalXp / 100), XP ring on child dashboard | P0 | groomed | xp |
| 0013 | Family Growth Score formula + 8-axis radar chart on the parent dashboard | P0 | groomed | growth |
| 0014 | Parent dashboard at / with household score, child cards, approval queue | P0 | groomed | dashboard |
| 0015 | Child dashboard at /kids/[childId] with avatar, level, today's quests | P0 | groomed | dashboard |
| 0016 | Quest detail page at /kids/[childId]/quests/[questId] | P1 | groomed | quests |
| 0017 | PWA manifest + service worker + install prompt for iOS and Android | P0 | groomed | pwa |
| 0018 | Mobile-first polish + desktop responsive QA + launch checklist | P0 | groomed | design |
| 0019 | Achievement badge system — 6 starter badges with criteria and display | P1 | proposed | xp |
| 0020 | AI Family Coach chat surface at /coach with conversation memory | P1 | proposed | ai |
| 0021 | AI Family Coach quest generation replaces selector.ts as primary path | P1 | proposed | ai |
| 0022 | Stripe subscriptions — Free vs Premium $9.99/mo and $84/yr | P1 | proposed | billing |
| 0023 | Premium gating — canAccess() on server and <UpgradeGate /> on client | P1 | proposed | billing |
| 0024 | OneSignal push notifications opted-in on day 3, not day 1 | P2 | proposed | notifications |
| 0025 | PostHog wiring — events table to PostHog ingestion + dashboards | P2 | proposed | analytics |
| 0026 | Weekly recap email — the comeback hook for week-2 churn | P1 | proposed | growth-loop |
| 0027 | Family Growth Score share card — the viral loop's atom | P1 | proposed | growth-loop |
| 0028 | Stale-household co-parent re-invite — day 7 nudge if only 1 parent active | P2 | proposed | growth-loop |
