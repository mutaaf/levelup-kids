# Roadmap — LevelUp Kids

The big-picture view. Tickets in `docs/backlog/` are the unit of execution; this file is the unit of intent. When the `gtm-innovation` agent grooms the backlog, it pulls from here.

## v1.0 — the 6-week core loop (the wedge)

**Window:** weeks 1–6 (six weeks from kickoff).
**Done when:** a parent can complete the success-criteria flow in `docs/PRD.md §10` on a real iPhone in under 10 minutes, and 10 design-partner families are using the app daily.

### Week 1 — Foundation
- 0001 — Scaffold Next.js 15 + Tailwind + shadcn + Supabase local + CI gating.
- 0002 — Schema (`households`, `parents`, `children`, `quest_templates`, `quests`, `quest_completions`, `events`) + RLS policies.
- 0003 — Parent sign-up + sign-in via Supabase Auth (magic link).
- 0004 — Household creation flow at `/onboarding/household`.

### Week 2 — Onboarding + child setup
- 0005 — Invite a co-parent (email-link join).
- 0006 — Add children at `/onboarding/children` (up to 3, name + age + avatar).
- 0007 — Focus pillar selection at `/onboarding/pillars` (2–3 of the 8).

### Weeks 2–3 — Quest engine
- 0008 — Quest template library (`quest_templates` seed, ≥ 80 templates across 8 pillars × 3 difficulty × age bands).
- 0009 — Quest selector (`src/lib/quests/selector.ts` — rule-based, seeds first week on household creation).
- 0010 — Weekly mission selector.
- 0011 — Child completion + parent approval flow (the approval queue on the dashboard).

### Week 4 — XP + Family Growth Score
- 0012 — XP awarding on approval + level derivation + XP ring component.
- 0013 — Family Growth Score formula + radar chart component.

### Week 5 — Dashboards
- 0014 — Parent dashboard at `/`.
- 0015 — Child dashboard at `/kids/[childId]`.
- 0016 — Quest detail page at `/kids/[childId]/quests/[questId]`.

### Week 6 — PWA + polish + launch
- 0017 — PWA manifest + service worker + install prompt on iOS + Android.
- 0018 — Mobile-first polish + desktop responsive QA + the launch checklist.

After 0018 ships, v1.0 is done. The gtm-innovation agent immediately starts grooming v1.1 from the proposed tickets below.

## v1.1 — the differentiator + monetization (agents drive)

**Window:** weeks 7–14 (eight weeks). The autonomous fleet (`ship`, `groom`, `review`, optional `eng`) takes this without human prompting.
**Done when:** AI Family Coach is live, Achievements are live, Stripe is live, and 100 families are on Premium.

Proposed tickets seeded in the backlog with `status: proposed` (the groomer will reshape and prioritize):

- 0019 — Achievement badge system (6 starter badges + criteria + display).
- 0020 — AI Family Coach chat surface (the `/coach` route).
- 0021 — AI Family Coach quest generation (replaces selector.ts as the primary path; selector becomes fallback).
- 0022 — Stripe subscriptions (Free vs Premium $9.99/month + $84/year).
- 0023 — Premium feature gating (`canAccess()` on server, `<UpgradeGate>` on client).
- 0024 — OneSignal push notifications (opt-in on day 3, not day 1).
- 0025 — PostHog wiring (`events` table → PostHog ingestion).
- 0026 — Weekly recap email (the comeback hook).
- 0027 — Score-share card (the viral loop's atom).
- 0028 — Co-parent re-invite for stale households.

The order above is *suggested*. The groomer reorders by leverage.

## v1.2 — the moat deepeners (autumn 2026)

**Window:** weeks 15–22.
**Theme:** the Family Growth Score becomes the share artifact and the seasonal campaigns become the comeback.

- Streak rescue ("you almost broke your 17-day streak — here's how to keep it tonight").
- Monthly boss battles (the deferred 250-XP family project).
- Seasonal campaign engine — Ramadan (first), Lent, summer break.
- Multi-household connections — "invite our friends' family" without sharing data.
- Coach memory — the AI Coach remembers what worked for THIS family last month.
- Dark mode.

## v2 — the platform (Q4 2026 + Q1 2027)

**Theme:** child profiles, native apps, broader age ranges.

- Child-side PIN-gated profile (each kid has their own view on shared devices).
- iOS + Android native shells (Capacitor wrapping the PWA — same codebase).
- Teen mode (ages 13–17) — the reward shape changes, the pillars stay.
- Tradition-specific quest packs (purchaseable add-ons).
- Public API for school-friendly integrations (read-only Family Growth Score).

## v3 — out of scope for the planning horizon

We don't plan past v2 in detail. The placeholder ideas:

- Coach marketplace (parents hire a real coach through the app).
- Family book club (the eight pillars feed a curated reading list).
- Community layer (anonymized challenges across opt-in families).

These are explicitly *not* roadmap commitments. They're parking spots. The product earns its right to build them by holding W4 retention ≥ 40%.

## What changes the roadmap

Three things, and only three:

1. **A v1.0 design-partner family says the loop is broken.** We fix the loop before adding a feature.
2. **Free → Premium conversion at v1.1 month 1 is below 4%.** The Premium offer is wrong; the AI Coach didn't carry. We re-shape Premium before pushing for more users.
3. **The founder ships an essay that triples the inbound.** Then v1.2 leans into the channel that worked.

Everything else is noise.
