---
id: 0019
title: Achievement badge system — 6 starter badges with criteria and display
status: proposed
priority: P1
area: xp
created: 2026-06-16
owner: gtm-innovation
---

## User story

As Layla earning her first badge for a 7-day streak, I want a small ceremony moment — the badge appears in my "Recent achievements" strip with a 600ms entrance and the badge title in Fraunces — so the work I've already been doing finally has a name attached to it.

## Why now (four lenses)

### Product Owner
v1.0 ships the empty state ("Your first badge is coming"). This ticket fills it. The simplification: 6 starter badges, hand-defined criteria, no badge editor.

### Stakeholder
Badges are the *named milestones* that make the loop legible across weeks. Without them, every approved quest is the same. With them, the parent can say "you got the Steady Reader badge this week."

### User (in the real moment of use)
Layla unlocks "Steady Reader" by doing Scholar quests 7 days in a row. The badge appears with the pillar tint and a single-sentence description.

### Growth
The badge unlock is the second of the five "show me" moments. The screenshot must compose cleanly: badge art + child's avatar + the unlock date.

## Proposed acceptance criteria (gtm-innovation to groom)

- [ ] 6 badges defined in `src/lib/achievements/badges.ts`: Steady Reader (Scholar 7-day streak), Strong Body (Athlete 14 quests in 28 days), Maker (Builder + Creator any 5), Servant Leader (Purpose 5 quests), Climber (first Level 5), Family Champion (Family Growth Score 80+).
- [ ] `<AchievementStrip childId />` on the child dashboard replaces the empty state when at least one badge is earned.
- [ ] Detail page at `/kids/[childId]/achievements/[badgeId]`.
- [ ] An `events` row `name: 'badge_earned'`.

## Out of scope

- Custom user-defined badges.
- Sharing a badge to a co-parent (covered by the v1.1 share-card ticket).

## Engineering notes

- Criteria are functions in `badges.ts`: `(childId) => Promise<boolean>`. Server-side evaluated on every approval.
- New table `achievements_earned` (`child_id`, `badge_id`, `earned_at`, unique on both columns).
- Migration `0007_achievements_earned.sql`.

## Implementation log

(Appended by implementation-dev during execution.)
