---
id: 0021
title: AI Family Coach quest generation replaces selector.ts as primary path
status: proposed
priority: P1
area: ai
created: 2026-06-16
owner: gtm-innovation
---

## User story

As Sara (premium subscriber), I want next Monday's quests to be tailored by the AI Coach based on what worked last week, what didn't, and our recent Coach conversation — so the loop feels like it learns, not like a fixed library on repeat.

## Why now (four lenses)

### Product Owner
The selector from 0009 becomes the *fallback*. The Coach becomes the primary. The simplification: same `seedFirstWeek` interface, AI provider behind it.

### Stakeholder
The "the app learns my family" surface is what justifies the Premium tier. Free families get the rule-based selector forever. Premium families get the Coach-augmented selector.

### User (in the real moment of use)
Monday morning, Layla opens her dashboard. The three quests reference the conversation Imran had with the Coach Sunday night. She doesn't know about the conversation, but Imran does.

### Growth
The "the app learns" claim becomes provable here. Critical for the v1.1 sales narrative.

## Proposed acceptance criteria (gtm-innovation to groom)

- [ ] `seedFirstWeek` and `seedNextWeek` Premium path call the Coach with system prompt + recent history.
- [ ] Coach output passes the selector's safety filter (age, banned content) before insert.
- [ ] On failure / rate-limit / provider error → fallback to rule-based selector from 0009.
- [ ] Cost cap per household per month — configurable in `households.ai_monthly_cap_usd`.

## Out of scope

- Per-child Coach personalization beyond age + history.

## Engineering notes

- `src/lib/quests/coach-selector.ts` wraps `callAI` + safety filter + fallback.

## Implementation log
