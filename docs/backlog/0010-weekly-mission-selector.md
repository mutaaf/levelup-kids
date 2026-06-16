---
id: 0010
title: Weekly mission selector seeds one mission per child per focus pillar rotation
status: groomed
priority: P1
area: quests
created: 2026-06-16
owner: gtm-innovation
---

## User story

As Imran landing on the parent dashboard on Monday, I want each of my children to have one weekly mission (a meatier multi-day quest) drawn from a focus pillar — rotating which pillar across weeks — so the parent dashboard shows three "this week" cards and the child dashboard surfaces a "this week's mission" alongside today's daily quests.

## Why now (four lenses)

### Product Owner
Weekly missions are the second beat of the loop. The smallest meaningful unit of value: one weekly mission per child, picked from a focus pillar with a rotation rule. Same engine as `seedFirstWeek` — a sibling function `seedWeeklyMission({ childId, weekStart })`.

### Stakeholder
The weekly mission is what the parent screenshots at the end of the week ("Layla finished her book" — the moat-deepening artifact). Without it, the loop is daily but never adds up to weekly. Without weekly aggregation, there's no Family Growth Score recap.

### User (in the real moment of use)
Layla, Sunday evening: "What's the weekly?" The mission is visible at the top of her dashboard with the pillar tint as a vertical accent. She can tap "ready" anytime in the 7-day window.

### Growth
The weekly mission anchors the v1.1 weekly-recap email and the v1.1 Family-Growth-Score share card. Done well now, it pays for itself across the rest of the roadmap.

## Acceptance criteria

Each box maps 1:1 to a vitest scenario.

- [ ] `src/lib/quests/weekly-selector.ts` exports `seedWeeklyMission({ childId, weekStart })` returning a single `Quest` row (type=`weekly`).
- [ ] Rotation rule: across consecutive weeks for the same child, the selector cycles through the household's focus pillars in order (A, B, A, B... for 2-pillar; A, B, C, A, B, C... for 3-pillar). Test: 6 consecutive weeks for a 2-pillar (Scholar, Athlete) household produce A, B, A, B, A, B.
- [ ] Filter rule: the picked template is `type = 'weekly'`, difficulty 2 or 3, and age-eligible for the child.
- [ ] No-repeat rule: a weekly template doesn't repeat within the same child's last 4 weekly missions.
- [ ] vitest: if no eligible template exists for the picked pillar (e.g. the library is thin for `purpose × age 17`), the selector falls back to the next pillar in rotation and logs a warning.
- [ ] `seedFirstWeek` calls `seedWeeklyMission` once per child during onboarding so the first parent dashboard shows daily AND weekly content.
- [ ] A scheduled (Supabase Edge Function — `weekly-mission-cron`) runs every Monday at 06:00 in each household's timezone to seed the next week's mission. v1.0 ships the function but does NOT install the cron — the v1.1 ticket flips the cron on. (Reason: in v1.0 the first 10 design-partner families are onboarded manually and the founder triggers the next week from the fleet-control portal; the cron is not load-bearing yet.)
- [ ] vitest: calling `seedWeeklyMission` for a week-start in the past throws (it's a forward-only seeder).
- [ ] `events` row written: `name: 'weekly_mission_seeded', props: { child_id, pillar }`.

## Out of scope

- A "decline this mission, give me another" button. The mission is the mission.
- A multi-pillar weekly mission (cross-pillar projects). v1.2 explore.
- Group missions across siblings. v2.
- Time-of-day notifications.

## Engineering notes

- `src/lib/quests/weekly-selector.ts` — pure function like the daily selector. Same RNG-injection pattern.
- Edge function lives at `supabase/functions/weekly-mission-cron/index.ts`. Reads all households' children, computes week-start in each household's timezone, calls `seedWeeklyMission` for each.
- Rotation state is derived from history (`SELECT pillar FROM quests WHERE child_id = X AND type = 'weekly' ORDER BY assigned_for DESC LIMIT 4`) — no stored "next pillar index" column.
- New deps: none.
- Migration: none.
- Privacy/security surface change: none.

## Implementation log

(Appended by implementation-dev during execution.)
