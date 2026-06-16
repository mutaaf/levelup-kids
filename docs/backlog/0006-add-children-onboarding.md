---
id: 0006
title: Add 1-3 children at /onboarding/children with age + avatar
status: groomed
priority: P0
area: onboarding
created: 2026-06-16
owner: gtm-innovation
---

## User story

As Imran (household just created, on `/onboarding/children`), I want to add up to three children — each with a first name, an age, and one of twelve shipped avatars — and tap "Continue" to land on `/onboarding/pillars` with the children inserted into the database, so the next step can offer me focus pillars informed by their ages.

## Why now (four lenses)

### Product Owner
This is the third leg of onboarding. The simplification: a single screen with up to three child-card rows. Each row is collapsed by default with "Add another child" expanding the next. The "Continue" button is enabled the moment at least one child is valid.

### Stakeholder
The privacy-by-construction posture lives here. The form has FOUR fields total per child: first name, age, avatar, optional interests (a short multi-select for v1.1 informing the AI Coach — v1.0 ships the field disabled with a "v1.1" tag). No last name. No school. No photo. No date of birth (age only).

### User (in the real moment of use)
Sara is on the couch, with Layla looking over her shoulder. Layla picks her own avatar by tapping it. The avatar choice is the moment Layla becomes interested in the product. The age input is a stepper (4–17), not a free-text field — fewer ways to typo.

### Growth
The "show me" moment that's *not* on `docs/GTM.md §5` but matters: the child seeing their own avatar appear. Designed correctly, this is the moment a parent says "ok, this is fun." Designed wrong, this is the moment Layla loses interest.

## Acceptance criteria

Each box maps 1:1 to a Playwright or vitest scenario.

- [ ] Playwright: `/onboarding/children` shows a progress chip "Step 2 of 3," a Fraunces h1 "Add your children." and an empty "Add a child" affordance.
- [ ] Playwright: tapping "Add a child" expands a card with: first name input, age stepper (4–17, default 7), and an avatar picker showing 12 avatars in a 4×3 grid (mobile) / 6×2 grid (desktop).
- [ ] Playwright: tapping an avatar replaces the placeholder in the child card with the chosen avatar at 96px. Tapping a different avatar swaps it.
- [ ] Playwright: the "Add another child" affordance is hidden after 3 children. Each child card has a "Remove" link in the header.
- [ ] Playwright: tapping "Continue" with at least one valid child navigates to `/onboarding/pillars`.
- [ ] vitest: a server action `setChildren(children: { name, age, avatar }[])` validates each child (name 1–24 chars, age 4–17, avatar in the shipped 12-id allow-list) and inserts rows into `children` with `household_id = (the parent's household)`. Existing children for the household are deleted first (idempotent re-submit).
- [ ] vitest: the action rejects > 3 children with an error (also surfaced inline on the form).
- [ ] vitest: an `events` row is written per child: `name: 'child_added', props: { age, avatar }`. No name in props (it's PII).
- [ ] Playwright: visiting `/onboarding/children` after children are already inserted shows the existing children pre-filled (so a refresh doesn't lose work) and allows edits / removals.
- [ ] `public/avatars/avatar-01.svg` through `avatar-12.svg` exist. Each is ≤ 12KB. Each renders correctly at 48, 96, 144px.
- [ ] An "Interests (v1.1)" pill is shown disabled inside each child card — preview UI only, no behavior.

## Out of scope

- Profile photo upload. Hard NO in v1.
- Interests (real selector). Ships disabled in v1.0; live behavior in v1.1.
- Child PIN / child login. Children share the parent's device in v1.
- Custom avatar generation. Twelve shipped avatars only.
- "Birthday" capture. We collect age (an integer), not DOB.

## Engineering notes

- Server action at `src/app/onboarding/children/actions.ts` — `setChildren(input)`. Uses `createServiceSupabase()` inside a transaction.
- Form is a client component using `useFormState` (Next 15 React 19 actions API).
- Avatar picker: `<AvatarPicker value selected onChange />` — a controlled component shared with the child profile edit surface (lives in `/household`).
- Avatars ship in `public/avatars/avatar-NN.svg`. Designed warm-palette, hand-drawn-feeling, diverse representation (skin tone, hair, hijab/no, glasses/no, age range 6–12 visual cue). They're SVG; an in-tree `script/audit-avatars.mjs` (gating in `lint`) asserts each is < 12KB.
- New deps: none.
- Migration: none (the table exists from 0002).
- Privacy/security surface change: this is the children-data collection point. The privacy page must mention exactly these four fields (name, age, avatar selection, parent-only visibility).

## Implementation log

(Appended by implementation-dev during execution.)
