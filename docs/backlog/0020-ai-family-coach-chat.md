---
id: 0020
title: AI Family Coach chat surface at /coach with conversation memory
status: proposed
priority: P1
area: ai
created: 2026-06-16
owner: gtm-innovation
---

## User story

As Imran (premium subscriber, end of week 2), I want to open `/coach` and ask "How do I help Yusuf get into reading?" and get a tailored 3-day mini-mission that uses Yusuf's age, current focus pillars, and recent quest history — so the AI Coach feels like it knows my family, not a generic chatbot.

## Why now (four lenses)

### Product Owner
The AI Coach is THE differentiator over chore apps and habit trackers. The simplification: a single chat surface with the household context system-prompted in. No multi-tab, no preset prompts, no character avatars for the coach.

### Stakeholder
The Coach is the v1.1 moat. Done right, it's the most defensible feature (the system prompt + the household context is the IP). Done wrong, it hallucinates parenting advice and undoes the trust the loop built.

### User (in the real moment of use)
Imran, Sunday evening, asks the question. The Coach answers in 2 short paragraphs + offers to seed 3 specific quests. He taps "Yes, seed them." They appear in Yusuf's Monday.

### Growth
The Coach answer is the fifth of the five "show me" moments — the screenshot a parent forwards to their best friend.

## Proposed acceptance criteria (gtm-innovation to groom)

- [ ] `/coach` at `src/app/(app)/coach/page.tsx` (Premium-gated — placeholder if 0023 hasn't shipped yet).
- [ ] System prompt names the 8 pillars, the household's focus pillars, each child's age, and the child's recent 14-day quest history. Caches via Anthropic prompt-caching.
- [ ] Conversation history persists per household in a `coach_messages` table.
- [ ] Coach can seed proposed quests directly via a structured tool call → `seedAiQuests({ childId, quests })`.
- [ ] Seeded quests still pass the selector's safety filter (no banned activities, age-eligible).
- [ ] Coach never proposes activities requiring child to be alone with strangers, leave home unattended, or contradict the household's stated focus pillars.
- [ ] Cost telemetry: every Coach call logged with token counts + estimated $.

## Out of scope

- Voice input. v1.2.
- Multi-coach personas. One Coach.

## Engineering notes

- All calls through `callAI()` from `src/lib/ai/client.ts`.
- New table `coach_messages`.

## Implementation log
