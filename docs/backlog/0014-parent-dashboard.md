---
id: 0014
title: Parent dashboard at / with household score, child cards, approval queue
status: groomed
priority: P0
area: dashboard
created: 2026-06-16
owner: gtm-innovation
---

## User story

As Imran, I want the parent dashboard at `/` to show — on one phone screen — our household name, the Family Growth Score radar, one card per child (avatar, name, level, today's completion %), the approval queue, and the "ask the Family Coach" stub button — so I can see the state of my family in one glance and act on the one pending thing (an approval) without scrolling.

## Why now (four lenses)

### Product Owner
The dashboard is the parent's home. Everything in v1.0 funnels through it. The simplification: one screen, one bottom-nav slot (Home), no settings overload. Settings is one tap away on the bottom nav.

### Stakeholder
The dashboard is the surface the design-partner families screenshot. The composition (household name + radar + child cards) must look like the product — not like a default Next.js app. The visual quality bar of this ticket is the visual quality bar of the launch.

### User (in the real moment of use)
Imran, 9pm, kids in bed. He opens the app on his phone. He sees: "The Aziz Family · Growth Score 64 (Scholar 71, Athlete 56)." Below: Layla (Lvl 4, 2/3 today), Yusuf (Lvl 2, 3/3 today). Below: "1 quest waiting for approval." He taps approve. He puts the phone down.

### Growth
The dashboard is screenshot #2 of the five canonical "show me" moments. It's also the surface the v1.1 weekly-recap email is composed from. Getting it right here matters far past launch.

## Acceptance criteria

Each box maps 1:1 to a Playwright or vitest scenario.

- [ ] Playwright: `/` redirects unauthenticated users to `/auth/signin`. Authenticated users with no `household_id` go to `/onboarding/household`.
- [ ] Playwright: an authenticated parent with a household + children + focus pillars sees the dashboard rendered with no loading spinner past 600ms.
- [ ] Composition (top to bottom on mobile):
  - [ ] Top: household name in Fraunces h2, the date.
  - [ ] `<FamilyGrowthRadar />` from 0013, centered, with focus pillars labeled.
  - [ ] One `<ChildCard child level todayCompletion />` per child, stacked. Each card: avatar 64px, name in body, level pill, "X / 3 today" pill, the child's three pillar dots colored by today's quest pillars.
  - [ ] `<ApprovalQueue />` (from 0011), or an empty state "Nothing waiting for approval right now."
  - [ ] "Ask the Family Coach" stub button — disabled, with copy "Lands in two weeks. Tell us what you want help with first." Tapping opens a small input that writes a row to a new `coach_wishlist` table (v1.0: just a feedback capture for shaping the v1.1 coach prompts).
  - [ ] Bottom nav (mobile) with three slots: Home (selected), Family (`/household`), Settings (`/settings`).
- [ ] Playwright (desktop, ≥ 1024px): the bottom nav becomes a left sidebar; the radar sits at top-right, the child cards take the left two-thirds. The asymmetric composition from `docs/DESIGN.md §4`.
- [ ] vitest: the dashboard's data is fetched in a single server-component render (no client-side waterfall). Three Supabase queries max: `household + parents + children + focus_pillars`, `today's quests + completions per child`, `pillar scores`.
- [ ] vitest: the dashboard handles the 0-child case by showing a "Add a child to see the loop" card linking to `/onboarding/children`.
- [ ] vitest: the dashboard handles the 0-completions case by showing "Your first week is seeded. Layla and Yusuf will see their quests tomorrow morning."
- [ ] An `events` row writes `name: 'dashboard_viewed'`.
- [ ] No purple gradient. No emoji in any heading. Bottom-nav icons are Lucide (Home, Users, Settings). Active tab uses `--brand-500`.

## Out of scope

- "Today's quests" inline view per child (you tap the child card to see them — that's `/kids/[childId]` from 0015).
- Notification opt-in.
- Subscription management (lives in `/settings`).
- A "what's new this week" banner (v1.1).
- Searching across quests, children. Not needed at this scale.

## Engineering notes

- `src/app/(app)/page.tsx` is the server component. Reads via `query()` helpers. Uses Suspense boundaries to stream the radar after the household-header.
- `<ChildCard />` at `src/components/dashboard/ChildCard.tsx`. Links to `/kids/[childId]`.
- `<HouseholdHeader />` at `src/components/dashboard/HouseholdHeader.tsx`.
- `<CoachStubButton />` at `src/components/coach/CoachStubButton.tsx`. Persists wishlist input via `addCoachWishlistEntry({ text })` action.
- New table `coach_wishlist` (migration `0006_coach_wishlist.sql`): `id`, `household_id`, `text` (≤ 240 chars), `created_at`. RLS: read/insert own household only.
- New deps: none.
- Privacy/security surface change: the wishlist text is parent-typed free-form. The privacy page must mention "any text you type into the coach wishlist is stored." No PII validation; just length cap.

## Implementation log

(Appended by implementation-dev during execution.)
