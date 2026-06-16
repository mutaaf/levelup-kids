---
id: 0016
title: Quest detail page at /kids/[childId]/quests/[questId]
status: groomed
priority: P1
area: quests
created: 2026-06-16
owner: gtm-innovation
---

## User story

As Layla tapping the body of a quest card on her dashboard, I want a focused detail page that shows the full quest title, the pillar, "what counts as done" in 2–3 sentences, my last 3 attempts at this quest type (with dates), the XP reward, and a big "I did it" button — so I can decide whether to do this one or back out, and I can see I've done it three Tuesdays running.

## Why now (four lenses)

### Product Owner
The detail page is the level of depth above the card. The simplification: one page, one CTA. No multi-tab structure. The "history" strip is a small 3-row list, not a chart.

### Stakeholder
The history strip is the *continuity* surface — the moat against "I forgot whether I read yesterday." It's the v1.0 seed of what becomes the AI Coach's memory in v1.1 ("this child has done 8 Scholar quests in the last 14 days — propose a stretch").

### User (in the real moment of use)
Layla, weekend, more time. She taps the Scholar quest body. She reads "20 minutes — your pick." She sees: "Last 3 times: Tue Jun 4 (approved), Sat Jun 1 (approved), Wed May 28 (not yet)." She knows what she's doing.

### Growth
Not a primary share surface, but the page composition (pillar tint + history strip + big button) sets the visual language reused by the v1.1 coach answer surface and the v1.1 achievement-detail surface.

## Acceptance criteria

Each box maps 1:1 to a Playwright or vitest scenario.

- [ ] Playwright: `/kids/[childId]/quests/[questId]` renders only when the calling parent shares a household with the child (RLS-enforced).
- [ ] Page composition:
  - [ ] Top: "← back to Layla's day" link.
  - [ ] Pillar badge (large, in-page).
  - [ ] Quest title in Fraunces h1.
  - [ ] Description in body text.
  - [ ] XP reward pip.
  - [ ] "Last 3 times" section: 3 rows, each with `(date · approved | not yet | pending)`. If fewer than 3, shows what exists. If zero, shows "First time — let's go."
  - [ ] Big "I did it" button (or "Waiting for approval" / "Approved" depending on completion state).
- [ ] Playwright: tapping the button triggers the same `markQuestReady` flow as the dashboard card.
- [ ] vitest: the "last 3 times" query returns ordered by `completed_at DESC`, joined to the matching template_id (so the history is across all completions of the *same template*, not the same `quest` row).
- [ ] vitest: a quest with no template_id (free-form, edge case for v1.1) falls back to matching by exact title.
- [ ] An `events` row `name: 'quest_detail_viewed'`.
- [ ] If the parent navigates here from `/` (the parent dashboard), the page shows an additional "Approve" button if the quest is in `ready` state — same action surface as the queue, here for one-off access.

## Out of scope

- An edit button for the quest. Quests are not editable in v1.
- A "log how it went" free-text field. Hard NO (we don't collect child-typed text in v1).
- Adding a quest to favorites. v2.
- A "skip today" affordance. Not skipped — just not done.

## Engineering notes

- `src/app/(app)/kids/[childId]/quests/[questId]/page.tsx` server component.
- Reuses `<QuestCard />` styling for the hero block but a larger size.
- New deps: none.
- Migration: none.

## Implementation log

(Appended by implementation-dev during execution.)
