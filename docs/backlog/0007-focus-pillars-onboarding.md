---
id: 0007
title: Pick 2-3 focus pillars at /onboarding/pillars
status: groomed
priority: P0
area: onboarding
created: 2026-06-16
owner: gtm-innovation
---

## User story

As Imran (children added, on `/onboarding/pillars`), I want to select 2–3 of the eight pillars to focus on this season, see the eight pillars laid out as warm tinted cards with a one-sentence "what this looks like in practice," and tap "Continue" to land on the parent dashboard with my household's `focus_pillars` set and the first week of quests seeded — so I see real content the moment I land.

## Why now (four lenses)

### Product Owner
This is the final onboarding leg. The simplification: 8 cards, choose 2 or 3 (not 1, not 4). The constraint matches the PRD's loop math (3 daily quests / focus pillars in rotation). The "Continue" button enables the moment the parent's count is in `[2, 3]`.

### Stakeholder
The focus-pillars choice is the *family-philosophy* moment. Two parents discussing "are we leaning into Scholar and Athlete this season, or Character and Builder?" is the highest-leverage conversation we can prompt. The screen is designed to invite that conversation — large cards, generous copy, no rush.

### User (in the real moment of use)
Imran is on the couch. Sara is next to him. They tap a pillar, read the one-sentence description, talk for 10 seconds, tap another. The vibe is "we're picking what we care about" — not "fill out this form."

### Growth
The chosen focus pillars appear on the parent dashboard as the labeled axes of the radar chart. Naming them well here makes the radar chart legible from the first session.

## Acceptance criteria

Each box maps 1:1 to a Playwright or vitest scenario.

- [ ] Playwright: `/onboarding/pillars` shows a progress chip "Step 3 of 3," a Fraunces h1 "Pick what you're focusing on this season." and a sub-line "Pick 2 or 3. You can change them whenever your family changes."
- [ ] Playwright: 8 pillar cards render in a 2×4 grid (mobile) / 4×2 grid (desktop). Each card shows: pillar icon (24px), Fraunces title, one-sentence body (≤ 18 words), the pillar tint as a left border (4px solid, `--pillar-<slug>`).
- [ ] Playwright: tapping a card toggles its selected state — selected cards get a filled tint background (the pillar color at 8% opacity) and a check glyph top-right.
- [ ] Playwright: tapping a 4th card unselects the earliest-selected card (FIFO replacement), with a 200ms layout transition. Continue stays enabled.
- [ ] Playwright: with 1 selected, the "Continue" button is disabled and a copy line reads "Pick one more."
- [ ] vitest: a server action `setFocusPillars({ pillars: string[] })` validates `pillars.length in [2, 3]` and every entry is in the 8-pillar enum, then `UPDATE households SET focus_pillars = $1 WHERE id = $2`.
- [ ] vitest: on successful save, the action calls `seedFirstWeek(householdId)` (defined in ticket 0009) and redirects to `/`.
- [ ] vitest: the `events` row `name: 'focus_pillars_set'` writes the pillars to `props`.
- [ ] Pillar cards' copy is hand-written and lives in `src/lib/pillars/copy.ts` (a const map). One-sentence body per pillar. Every line passes the banned-words check (no "journey," etc.) — vitest covers this.
- [ ] Playwright: after redirect to `/`, the parent dashboard (placeholder 0014 or real) shows the household name and one child card per child, populated with three "today's quests" each (seeded by 0009).

## Out of scope

- Picking different focus pillars per child. v1 is household-level focus; per-child focus is v2.
- A "let me think" save-for-later option. The onboarding is one sitting in v1.
- A "see what other families chose" social-proof affordance.
- An animated pillar-tile picker. Animations: 200ms tint, period.

## Engineering notes

- Server action at `src/app/onboarding/pillars/actions.ts` — `setFocusPillars(input)`. Validates with zod against `PillarSlug` enum from 0002.
- `seedFirstWeek` callable lives in `src/lib/quests/seed-first-week.ts` (implemented in 0009; this ticket can stub it as a no-op and 0009 fills in the real impl).
- Pillar cards: `<PillarCard pillar={slug} title body selected onToggle />`. Lives at `src/components/pillars/PillarCard.tsx`. Used here and on `/household` for the change-pillars flow.
- Copy const at `src/lib/pillars/copy.ts`: `{ scholar: { title: 'Scholar', body: '...' }, ... }`. Reused by the pillar badge, the radar chart legend, and the AI Coach prompt in v1.1.
- The FIFO replacement uses a tiny in-place reducer; no library.
- New deps: none.
- Migration: none.
- Privacy/security surface change: focus_pillars is household-level metadata — fine.

## Implementation log

(Appended by implementation-dev during execution.)
