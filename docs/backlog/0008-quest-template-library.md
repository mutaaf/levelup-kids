---
id: 0008
title: Quest template seed library across the 8 pillars and 3 age bands
status: groomed
priority: P0
area: quests
created: 2026-06-16
owner: gtm-innovation
---

## User story

As the implementation-dev agent shipping 0009, I want a hand-written quest template library of at least 80 entries (8 pillars × 10 templates each, spread across difficulty 1–3 and age bands 4–7, 8–10, 11–13, 14–17) — so the selector has enough material to seed a real first week without repeats.

## Why now (four lenses)

### Product Owner
The library is the v1.0 brain. The selector picks from it; the AI Coach in v1.1 augments it. Shipping it well in 0008 means 0009 (the selector) can be tested against real templates, not against placeholder fixtures.

### Stakeholder
The voice of the templates IS the voice of the product. A template that says "Practice your dribble for 15 minutes — strong work!" is wrong (banned word). A template that says "Spend 15 minutes with the ball — the one that doesn't go where you thought is the one to do twice" is right (warm, specific, parent-respecting).

### User (in the real moment of use)
Layla, age 10, opens her dashboard. The three daily quests she sees are: "Read 20 minutes — your choice." (Scholar), "15 minutes outside with a ball." (Athlete), "Write a short note for someone in our family." (Character). Each one is specific enough that she knows what counts as done, open enough that she chooses how.

### Growth
A great library is the moat against the AI Coach hallucinating bad suggestions in v1.1. The Coach's instruction prompt names the library as the canon — "stay near these templates in spirit."

## Acceptance criteria

Each box maps 1:1 to a vitest scenario.

- [ ] `supabase/migrations/0004_seed_quest_templates.sql` runs cleanly on `supabase db reset` and inserts at least 80 rows into `quest_templates`.
- [ ] Every pillar (`scholar | athlete | builder | creator | leader | character | explorer | purpose`) has at least 10 templates.
- [ ] Across all pillars, every age band has at least 12 templates available (`age 6` returns ≥ 12; `age 10` returns ≥ 12; `age 14` returns ≥ 12). Tested via a vitest query.
- [ ] Difficulty 1 = 5 XP, difficulty 2 = 10 XP, difficulty 3 = 15 XP. Weekly missions have difficulty 2 (50 XP override) or 3 (75 XP override). XP override lives in a `quests.xp_reward` column (already in the schema from 0002); templates set it explicitly.
- [ ] No template's `title` exceeds 60 characters.
- [ ] No template's `description` exceeds 220 characters.
- [ ] vitest covers the banned-words check: no template's title or description contains the banned-words list from AGENTS.md.
- [ ] vitest covers an inclusive-voice check: no template uses gendered pronouns ("he," "she") in the description. Use "your child," "you," or the child's perspective.
- [ ] At least 2 templates per pillar are `type = 'weekly'`. The rest are `type = 'daily'`. Zero `type = 'monthly'` in v1.0 (the boss-battle ticket is v1.2).
- [ ] vitest snapshot: the seed produces a stable count per (pillar, difficulty, age-band) triple — the snapshot rejects drift if a future migration changes the library accidentally.

## Out of scope

- AI-generated templates. The library is hand-written for v1.0; the AI Coach in v1.1 *suggests* in addition to the library.
- Templates targeting specific traditions (Ramadan, Lent). Those land in the v1.2 seasonal-campaign ticket.
- Multilingual support. English only in v1.
- A library admin UI. Tickets edit the SQL.

## Engineering notes

- The migration writes raw SQL INSERTs. Each row gets a deterministic UUID via `md5('seed:' || pillar || ':' || ordinal)` to make re-seeding idempotent.
- The author of this ticket (gtm-innovation) writes the actual template text alongside the implementation-dev's pass — implementation-dev should NOT invent template copy. If the ticket is missing template text when picked up, the dev opens it back as `needs-discovery` instead of inventing.
- A small helper at `src/lib/quests/seed-library.ts` re-exports the templates as TypeScript constants (for the AI Coach prompt in v1.1 to reference). The migration is the source of truth; the TS file is a derivation generated via `node scripts/dump-quest-library.mjs`.
- `scripts/dump-quest-library.mjs` lives alongside `check-backlog.mjs` and is run in the `lint` job to assert the SQL and the TS export agree (drift would fail CI).
- New deps: none.
- Migration version: `0004`.
- Privacy/security surface change: none.

## Implementation log

(Appended by implementation-dev during execution. The first action is for gtm-innovation to land the template text — see "Engineering notes" above.)
