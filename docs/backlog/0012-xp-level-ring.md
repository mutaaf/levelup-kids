---
id: 0012
title: XP awarded on approval, level derived as floor(totalXp / 100), XP ring on child dashboard
status: groomed
priority: P0
area: xp
created: 2026-06-16
owner: gtm-innovation
---

## User story

As Layla, I want to see my level pill grow next to my avatar and my XP ring fill toward the next level the moment Sara approves a quest — so the loop feels like the loop, not a database update.

## Why now (four lenses)

### Product Owner
XP is the *signal* layer the loop produces. Level is the *summary* layer the user feels. The simplification: level is `floor(totalXp / 100)`, derived on read — never stored. No level table, no curve, no soft-cap. The XP ring is a single SVG component.

### Stakeholder
A derived level field means an agent can't desync the cache by forgetting to update a column. There IS no column to update. This is the kind of small architectural decision that pays for itself across the v1.1 backlog.

### User (in the real moment of use)
Layla taps "I did it." Sara taps "Approve." Layla's screen, if she's looking: the ring fills 5% with a soft ease, the +5 pip floats. On level-up: avatar grows 8%, the number rolls, ring resets. No confetti.

### Growth
The level-up moment is the first of the five "show me" screenshots in `docs/GTM.md §5`. The composition (avatar + level pill + the quest that earned it) must be one phone-screen-sized share-able image.

## Acceptance criteria

Each box maps 1:1 to a vitest or Playwright scenario.

- [ ] `src/lib/growth/level.ts` exports `level(totalXp: number): number = Math.floor(totalXp / 100)` and `xpToNextLevel(totalXp: number): number = 100 - (totalXp % 100)`. Both pure.
- [ ] vitest: covers `level(0) === 0`, `level(99) === 0`, `level(100) === 1`, `level(549) === 5`, `level(550) === 5`, `level(10000) === 100`.
- [ ] `src/hooks/use-child-xp.ts` returns `{ totalXp, level, xpToNext, change }` for a given child. Subscribes to Supabase realtime on `quest_completions` to push updates without a refetch.
- [ ] vitest: a query helper `getChildTotalXp(childId)` sums `xp_awarded` from `quest_completions` where `child_id = X AND approved_at IS NOT NULL`. The query plan uses an index on `(child_id, approved_at)`.
- [ ] `supabase/migrations/0005_xp_index.sql` adds the index.
- [ ] `<XpRing childId size="sm|md|lg" />` (`src/components/xp/XpRing.tsx`) renders an SVG circle with a stroke that animates to the new percentage on `xpToNext` change. 600ms ease-out via Motion.
- [ ] `<LevelBadge level />` (`src/components/xp/LevelBadge.tsx`) is a small pill bottom-right of the avatar. On level change, the number rolls in 800ms via Motion's spring.
- [ ] Playwright (or integration test): approving a quest from the parent dashboard triggers — within 1 second — the child dashboard's XP ring to fill by the right delta. (Tested via a two-tab Playwright scenario.)
- [ ] Level-up case: when an approval crosses a 100-XP threshold, the child dashboard plays the level-up motion: avatar grows 8% over 400ms, level pill rolls, ring resets to 0%. No confetti, no sound (audio is a v1.1 ticket).
- [ ] `prefers-reduced-motion: reduce` collapses all of the above to opacity-only crossfades.
- [ ] vitest: the XP awarded on approval is *immutable* — attempting to update `quest_completions.xp_awarded` after `approved_at IS NOT NULL` raises (already enforced by the trigger from 0002; this ticket adds the test).

## Out of scope

- Pillar-specific XP / per-pillar levels. v1.1.
- Streak XP bonuses. v1.1.
- A leaderboard. We don't compare children to each other. Hard NO.
- Daily XP caps. The loop is self-limiting (3 daily quests + 1 weekly).
- A "spend XP" economy (rewards store). Not in this product.

## Engineering notes

- `<XpRing />` SVG: two `<circle>` elements (track + indicator). The indicator's `stroke-dasharray` is `2 * Math.PI * r`. The dash-offset is animated.
- `<LevelBadge />` uses a number-roll animation: render the new number with `key={level}` and Motion's `<AnimatePresence>` to fade-and-rise the digits.
- Realtime: Supabase channel `realtime:quest_completions:child_id=eq.<childId>` listens on INSERT and UPDATE. The hook computes `change` as `(new totalXp) - (previous totalXp)`.
- Performance budget: the XP ring + level badge must not cause a layout shift on the child dashboard. Pre-allocate the layout slot.
- New deps: none.
- Migration: `supabase/migrations/0005_xp_index.sql`.
- Privacy/security surface change: none.

## Implementation log

(Appended by implementation-dev during execution.)
