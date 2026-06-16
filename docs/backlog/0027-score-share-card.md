---
id: 0027
title: Family Growth Score share card — the viral loop's atom
status: proposed
priority: P1
area: growth-loop
created: 2026-06-16
owner: gtm-innovation
---

## User story

As Imran (proud of week 4's Family Growth Score), I want to tap "share" on the radar chart and get a clean image — household name, the radar with focus pillars filled, one short caption — saved to my phone's camera roll in one tap — so I can send it to my best friend with my own message.

## Why now (four lenses)

### Product Owner
The share card is the v1.1 viral loop. The simplification: ONE composition (the radar + household name + week date), no customization, no "choose a style."

### Stakeholder
The card is the moat *as a share artifact*. Composing it well here is the difference between organic growth and paid acquisition in v1.2.

### User (in the real moment of use)
Imran taps share. The card generates server-side as a PNG. iOS share sheet opens. He picks Messages, picks his friend, types one sentence. Done.

### Growth
This is the explicit v1.1 viral mechanic.

## Proposed acceptance criteria (gtm-innovation to groom)

- [ ] `/api/share/score-card?householdId=X&week=Y` returns a 1200×630 PNG.
- [ ] Composition: household name in Fraunces, radar centered, focus-pillar names labeled, week date small at bottom, "levelupkids.app" footer.
- [ ] Anonymized — no child names, no parent names, just household name (which the parent typed).
- [ ] Generated via `@vercel/og` (no headless browser).
- [ ] Native share sheet via Web Share API.

## Out of scope

- Multi-week comparison cards.
- Per-child cards.

## Engineering notes

- `@vercel/og` dep.
- Rate limit: 10/hour/household.

## Implementation log
