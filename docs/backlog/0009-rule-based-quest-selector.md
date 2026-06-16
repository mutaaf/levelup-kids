---
id: 0009
title: Rule-based quest selector seeds the first week on household creation
status: groomed
priority: P0
area: quests
created: 2026-06-16
owner: gtm-innovation
---

## User story

As Imran (focus pillars just submitted), I want my household's first week of quests already assigned — 3 daily quests per child per day for 7 days, drawn from our focus pillars and filtered to each child's age, mapped into the `quests` table with `assigned_for` dates — so when I land on the parent dashboard I see real content for each child immediately, not an empty state.

## Why now (four lenses)

### Product Owner
This is the function that makes onboarding feel like the product, not a form. The simplification: ONE rule set, no AI, no preferences asked — the parent's focus-pillar choice + each child's age is enough signal. The function is `seedFirstWeek({ householdId })`.

### Stakeholder
This function is the v1.0 brain and the v1.1 fallback. When the AI Coach goes live in v1.1, the selector becomes the safety net for when the Coach fails / is rate-limited / proposes a template-violating quest. Engineering the selector well now means v1.1 inherits a real fallback.

### User (in the real moment of use)
Imran lands on the dashboard. Each child card has "Today's quests: 3" and a glance at the avatar shows three pillar-tinted dots. The "Open Layla's day" tap takes him straight to a real list. No tutorial. No empty state.

### Growth
The first-five-minutes experience is the make-or-break for D1 retention. A seeded first week is the difference between "I'll check tomorrow" and "I'll show Sara tonight."

## Acceptance criteria

Each box maps 1:1 to a vitest scenario.

- [ ] `src/lib/quests/selector.ts` exports `seedFirstWeek({ householdId })` returning `{ quests: Quest[] }`.
- [ ] The selector reads the household's `focus_pillars` and `children` rows, then for each child creates 3 daily quests × 7 days = 21 quests in the `quests` table.
- [ ] Selector rule 1: each focus pillar appears in at least 1 of the 3 daily quests every day (so a 2-pillar household: pillar A, pillar B, then the third slot rotates between A and B — round robin per day).
- [ ] Selector rule 2: a 3-pillar household: each of the 3 slots is one of the 3 pillars — clean.
- [ ] Selector rule 3: no daily quest template repeats within the same 7-day window for the same child.
- [ ] Selector rule 4: each daily quest's template is filtered to the child's age (`template.min_age <= child.age <= template.max_age`) and to difficulty 1 (the day-to-day baseline).
- [ ] vitest: a 2-pillar household with a 7-year-old and a 10-year-old gets exactly 42 `quests` rows (21 per child). Each child's 21 rows include zero template duplicates.
- [ ] vitest: a 3-pillar household with a 5-year-old gets 21 quests with all three pillars represented each day.
- [ ] vitest: if a focus pillar has < 7 age-eligible difficulty-1 templates, the selector returns a soft warning (logged) and reuses the earliest template for the gap days. The test asserts the warning is logged but the function still returns a valid 21-row set.
- [ ] Selector is pure — given the same inputs and a seeded RNG (the function takes an optional `rng?: () => number` defaulting to `Math.random`), it produces a deterministic output. The vitest uses a seeded RNG.
- [ ] vitest: the function does not call `Math.random` directly anywhere in the implementation — it uses the injected RNG.
- [ ] After seeding, an `events` row is written: `name: 'first_week_seeded', props: { household_id, quest_count }`.

## Out of scope

- Generating *new* quests (the templates exist in 0008's table).
- Weekly missions (that's ticket 0010).
- AI-augmented quests (v1.1).
- A "regenerate this week" button (manual reseed is a v1.1 enhancement).
- Personalization beyond age + focus pillars.

## Engineering notes

- `src/lib/quests/selector.ts`. Pure TS function; no Supabase imports — it returns the rows to insert.
- The CALLER inserts: a server action `seedFirstWeek({ householdId })` in `src/app/onboarding/pillars/actions.ts` wraps the selector + the DB insert in a single transaction.
- The first day of the week is `today` in the household's timezone (v1.0 assumes parent device timezone — captured client-side and passed as a `timezoneOffset` param to the action). v1.1 ticket: explicit household-timezone setting.
- New deps: none.
- Migration: none.
- Engineering NOTE: the selector's RNG-injection design is what lets the v1.1 AI-Coach selector wrap it cleanly.

## Implementation log

(Appended by implementation-dev during execution.)
