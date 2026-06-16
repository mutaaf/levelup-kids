---
id: 0004
title: Household creation flow at /onboarding/household
status: groomed
priority: P0
area: onboarding
created: 2026-06-16
owner: gtm-innovation
---

## User story

As Imran (signed in for the first time, parked on `/onboarding/household`), I want to name my household ("The Aziz Family"), set my own name ("Imran"), and tap "Continue" to land on `/onboarding/children` with a household row in the database, my parents row updated with `household_id` and `role = 'admin'` — so I'm no longer a homeless authenticated user and the onboarding meter has moved.

## Why now (four lenses)

### Product Owner
This is the second-leg of onboarding. The simplification: one screen, two fields, no "household type" selector (we don't care if it's a family, a household, a co-living group). Imran finishes it in under 30 seconds.

### Stakeholder
The "household" is the atomic unit of the product. Every quest, every approval, every Family Growth Score lives at this level. Defining it cleanly here pays for itself for the rest of v1.

### User (in the real moment of use)
Imran is on the train. He types "The Aziz Family" with one hand. The submit button is thumb-reachable bottom-right. He taps; he's on the next screen in under a second.

### Growth
The household name appears on the parent dashboard ("The Aziz Family · Growth Score 64"). It also appears on the v1.1 weekly recap share card. Naming it well here gives every share artifact a noun to point at.

## Acceptance criteria

Each box maps 1:1 to a Playwright or vitest scenario.

- [ ] Playwright: a signed-in parent with no `household_id` who visits `/` is redirected to `/onboarding/household`. The middleware honors a `?next=/` query.
- [ ] Playwright: visiting `/onboarding/household` shows two inputs (household name + parent name), a primary submit button "Continue," and a top progress chip "Step 1 of 3."
- [ ] vitest: submitting the form calls a server action `createHousehold({ householdName, parentName })` that (a) inserts a `households` row with the name + `subscription_tier = 'free'` + `focus_pillars = []`, (b) updates the current parent's row with `household_id = new.id`, `role = 'admin'`, `name = parentName`, (c) returns the new `household.id`, all in one Supabase transaction (RPC or service-role transaction).
- [ ] vitest: if the household name is empty, the action returns a validation error and no DB writes happen.
- [ ] vitest: if the household name is > 60 chars, the action rejects it with an inline error.
- [ ] vitest: an authenticated parent who already has `household_id` who POSTs to `createHousehold` is redirected to `/onboarding/children` instead of creating a second household.
- [ ] Playwright: after successful submit, the URL is `/onboarding/children` and the page renders the child-setup surface from ticket 0006 (placeholder is fine for this ticket if 0006 hasn't shipped yet).
- [ ] The household name input has `inputMode="text"` and `autoComplete="off"`. The parent name input has `autoComplete="given-name"`.
- [ ] Copy: the Fraunces h1 reads "Name your household." Sub-copy: "We'll show this name on every Family Growth Score." No exclamation marks.
- [ ] An `events` row is written: `name: 'household_created'`, `props: { source: 'onboarding' }`. (For PostHog ingestion in v1.1.)

## Out of scope

- Inviting a co-parent (that's ticket 0005, exposed as an optional inline action after this step OR as the third onboarding screen depending on what feels lighter — leave that decision to 0005's design).
- Choosing focus pillars (ticket 0007).
- Adding children (ticket 0006).
- Household avatar / image (no image upload in v1).
- "Household type" selector (single-parent / two-parent / etc.). Not a v1 concept.

## Engineering notes

- Server action lives at `src/app/onboarding/household/actions.ts` exporting `createHousehold(input)`. Validate with zod. Use `createServiceSupabase()` for the insert + update, wrapped in `db.rpc('create_household', ...)` to keep it atomic (write the RPC as part of this ticket's migration `0002_create_household_rpc.sql`).
- Form lives at `src/app/onboarding/household/page.tsx` (server component shell + client form). Use shadcn `Input`, `Label`, `Button`, `Card`. The progress chip is a small in-house component `<OnboardingProgress step={1} total={3} />` reused by 0006 and 0007.
- Use Next.js's `redirect()` from server action; do NOT use client-side router push for the post-submit nav.
- New deps: `zod` if not present.
- Migration: `supabase/migrations/0002_create_household_rpc.sql` (single CREATE FUNCTION).
- Privacy/security surface change: no new data collected; the household name is text.

## Implementation log

(Appended by implementation-dev during execution.)
