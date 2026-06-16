---
id: 0015
title: Child dashboard at /kids/[childId] with avatar, level, today's quests
status: groomed
priority: P0
area: dashboard
created: 2026-06-16
owner: gtm-innovation
---

## User story

As Layla (handed the phone by Sara, on `/kids/<her id>`), I want to see my avatar with my level pill and XP ring, my "today's quests" as three pillar-tinted cards each with a big "I did it" button, and "this week's mission" above them — so I can pick the one I want to do right now and tap the button without thinking about anything else.

## Why now (four lenses)

### Product Owner
The child dashboard is the child's whole product. The simplification: one screen, no tabs, no menu, the only navigation is the "← back to family" link at the top. Everything Layla cares about lives below the fold of this one screen.

### Stakeholder
This is the surface that decides whether v1.0 retains children. If Layla doesn't open it tomorrow, the loop dies regardless of what the parent dashboard does. The voice ("your quests" not "Layla's tasks for today!"), the motion (calm pride, no confetti), and the composition (the avatar is big and proud) are all moat.

### User (in the real moment of use)
Layla, 7:15am. She taps her avatar from the parent dashboard. She sees her three quests. She taps "I did it" on Scholar. The button morphs. She locks the phone. The streak doesn't break.

### Growth
The "first level-up" screenshot — moment #1 in `docs/GTM.md §5` — is composed here. The screenshot must look like the same product as the parent dashboard but feel like the child's own surface.

## Acceptance criteria

Each box maps 1:1 to a Playwright or vitest scenario.

- [ ] Playwright: visiting `/kids/[childId]` as a parent of that child's household renders the dashboard. A parent of a different household gets a 404 (RLS-driven).
- [ ] Playwright: the page has:
  - [ ] Top: "← back to family" text link returning to `/`.
  - [ ] Hero block: child's avatar at 144px on mobile, `<XpRing size="lg" />` around it, `<LevelBadge />` bottom-right of avatar, child's first name in Fraunces display below.
  - [ ] If streak ≥ 3 days: `<StreakChip days={N} />` to the right of the name (the only allow-listed emoji `🔥`).
  - [ ] "This week's mission" card (the active weekly quest from 0010), pillar-tinted left border.
  - [ ] Today's quests: three `<QuestCard />` stacked, in the assigned-for order from the selector, each with the appropriate state (`idle | ready | approved`).
  - [ ] Recent achievements: empty state "Your first badge is coming. Keep completing quests." with the `no-approvals.svg` illustration. (Badges land in v1.1.)
- [ ] Playwright: tapping a quest card "I did it" button triggers the flow from ticket 0011 and the card transitions to "Waiting for approval" without a page reload.
- [ ] Playwright: tapping a quest card's body (not the button) navigates to `/kids/[childId]/quests/[questId]` (ticket 0016).
- [ ] Playwright: on level-up — simulated by approving the 100th XP from a parent tab — the child's dashboard plays the level-up motion from 0012 (avatar grows 8%, level number rolls, ring resets). Verified by checking the rendered level pill text after the motion completes.
- [ ] vitest: data fetch is one server component + Supabase realtime subscription on `quest_completions` for this `child_id`. No client-side polling.
- [ ] vitest: the streak calculation is `consecutive days backward from today with at least one approved completion`. Tested with three fixture cases: 0-day, 3-day, 14-day.
- [ ] `events` row `name: 'child_dashboard_viewed'`.
- [ ] Performance budget: TTI < 2.0s on iPhone-12 throttled 4G.

## Out of scope

- A child-side history view of past quests. v1.1.
- A child-side notes / journal. Hard NO in v1 (we don't collect child-typed text).
- Audio feedback / sound effects on completion. v1.1.
- A child-only PIN to gate this surface. v2 — the parent's session is the trust boundary in v1.
- A "challenge a sibling" surface.

## Engineering notes

- `src/app/(app)/kids/[childId]/page.tsx` server component. Wraps in a layout that hides the bottom nav (child surface is full-screen so it feels different from the parent surface).
- `<ChildHero child totalXp level />` and `<TodayQuests quests />` are the two big composition units.
- The streak hook `useStreak(childId)` reads via SQL: `WITH days AS (SELECT date_trunc('day', approved_at AT TIME ZONE 'UTC') AS d FROM quest_completions WHERE child_id = X AND approved_at IS NOT NULL GROUP BY 1 ORDER BY 1 DESC) ...`. Performant on the index from 0005.
- The illustration `no-approvals.svg` (from 0006's avatar bundle expansion) lives in `public/illustrations/`. If not shipped yet, this ticket ships a one-line "Your first badge is coming." text + the pillar icon — the illustration land in 0018's polish pass.
- New deps: none.
- Migration: none.
- Privacy/security surface change: the child dashboard renders inside the parent's session; no separate child auth.

## Implementation log

(Appended by implementation-dev during execution.)
