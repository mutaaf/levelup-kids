---
id: 0013
title: Family Growth Score formula + 8-axis radar chart on the parent dashboard
status: groomed
priority: P0
area: growth
created: 2026-06-16
owner: gtm-innovation
---

## User story

As Imran (end of week 2), I want a single radar chart on my parent dashboard that shows our household's Family Growth Score per pillar — the focus pillars filled and labeled with the 0–100 number, the non-focus pillars greyed with "not in focus this season" copy on hover — so I have the one screenshot I'll send Sara at the end of the month.

## Why now (four lenses)

### Product Owner
The Family Growth Score is the *moat surface*. The smallest meaningful unit of value: a function `scoreForPillar(householdId, pillar) → 0–100` and a radar chart that calls it once per pillar. The function lives in `src/lib/growth/score.ts` per `docs/ARCHITECTURE.md §4.2`.

### Stakeholder
This is THE moat. Competitors do one pillar. We do eight, summed into one chart. The chart is the share artifact. The v1.1 share-card ticket builds on top of this radar; the v1.2 weekly-recap email embeds it. Getting it right here pays compounding interest.

### User (in the real moment of use)
Imran, end of week 2, parent dashboard, top of the screen. Two filled axes (Scholar + Athlete = 64, 71). The non-focus axes greyed. He hovers Scholar; a tiny popover shows "+12 since last week." He takes a screenshot.

### Growth
"Take a screenshot, send to your best friend with this caption" is the implicit v1.0 viral surface — the explicit one ships in v1.1. The screenshot must compose cleanly on a phone screen with the household name above it.

## Acceptance criteria

Each box maps 1:1 to a vitest or Playwright scenario.

- [ ] `src/lib/growth/score.ts` exports `scoreForPillar({ householdId, pillar, asOf?: Date }): Promise<number>` returning a 0–100 integer (rounded). Formula matches `docs/ARCHITECTURE.md §4.2`: `round(70 * completion_rate + 30 * consistency)` on the trailing 28 days.
- [ ] `completion_rate = approved_completions_in_pillar / expected_completions_in_pillar`, capped at 1.0. `expected = 3 * 28 / focus_pillar_count` per child summed across children if pillar is in focus, else `expected = 0` and the function returns null.
- [ ] `consistency = days_in_28_with_at_least_one_approved_completion_in_pillar / 28`.
- [ ] vitest: a brand-new household (0 completions) returns 0 for every focus pillar and null for every non-focus pillar.
- [ ] vitest: a household with 100% completion + 100% consistency over 28 days returns 100.
- [ ] vitest: a household completing the daily quest 7/7 days in scholar but 0/7 in athlete (a 2-pillar focus): scholar score = 100, athlete score = 0.
- [ ] vitest: a household with 28/28 days completion-and-consistency in scholar but only on the round-robin third slot (so half the days): scholar score = 50 ish (the precise math from the formula).
- [ ] vitest: a non-focus pillar returns null (the radar greys it out with "not in focus this season" copy).
- [ ] `<FamilyGrowthRadar focus={['scholar','athlete']} scores={{ scholar: 64, athlete: 71, ... }} />` renders an 8-axis SVG radar chart. Axes labeled with pillar names in Fraunces 12px. Filled axes use the pillar tint at 30% opacity for the polygon, 100% for the outline.
- [ ] Playwright: hovering an axis on desktop shows a popover with `{score}/100 · +{delta} since last week`. On touch, tapping shows the popover.
- [ ] The radar is a custom in-house SVG component at `src/components/growth/FamilyGrowthRadar.tsx`. No chart library is added as a dep.
- [ ] vitest: a snapshot test on the radar component asserts the SVG structure for a fixed scores input (regression test against future styling drift).
- [ ] The score is cached on the server with a 5-minute TTL — `src/lib/growth/cache.ts`. Re-render of the parent dashboard within 5 minutes does not re-query.
- [ ] vitest: an `events` row `name: 'growth_score_viewed'` writes the focus-pillar scores anonymously (no parent id) when the parent dashboard loads.

## Out of scope

- Per-child Family Growth Score (we have child level for that). Scores are household-level in v1.
- Score history beyond the 28-day window — that lands in v1.1 with the weekly-recap.
- A "compare to other families" surface. Hard NO.
- A "set a score goal" surface. v1.2 explore.
- Pillar-by-pillar drill-down. The hover popover is the v1 drill-down.

## Engineering notes

- `score.ts` is pure SQL behind a TS interface. Use a single query per call: `SELECT approved_at::date, count(*) FROM quest_completions JOIN quests ON ... WHERE pillar = $1 AND household_id = $2 AND approved_at > now() - interval '28 days' GROUP BY 1`. Then compute completion_rate + consistency in JS.
- The radar SVG: 8 axes at `i * 45°` around a unit circle. Convert (axis, score) → (cx, cy) via `cx = cos(θ) * (score / 100) * r`. The polygon path is `M` + `L`s + `Z`.
- New deps: none.
- Migration: none (an index on `(household_id, approved_at)` lives in 0005 from 0012).
- Privacy/security surface change: none.

## Implementation log

(Appended by implementation-dev during execution.)
