---
id: 0023
title: Premium gating — canAccess() on server and <UpgradeGate /> on client
status: proposed
priority: P1
area: billing
created: 2026-06-16
owner: gtm-innovation
---

## User story

As Imran (free user) tapping the AI Coach button on the parent dashboard, I want a contextual upgrade surface that names exactly what unlocks ("The Coach will answer questions about Layla and Yusuf — they know what worked last week.") with a one-tap upgrade — so the wall feels like a fair trade, not a tease.

## Why now (four lenses)

### Product Owner
Gating is both UI and server. The simplification: one `canAccess(householdId, 'feature_key')` server function + one `<UpgradeGate feature />` client component.

### Stakeholder
A client-only gate is a security regression waiting to happen. Pair server + client.

### User (in the real moment of use)
Imran feels the wall in the *right* moment — when he's already convinced he wants the Coach.

### Growth
The Premium-feature framing ("unlimited children, AI Coach, advanced analytics, seasonal campaigns") names benefits, not tier names.

## Proposed acceptance criteria (gtm-innovation to groom)

- [ ] `src/lib/tier.ts` exports `canAccess(householdId, feature: FeatureKey): Promise<boolean>`.
- [ ] Feature keys: `ai_coach`, `unlimited_children`, `advanced_analytics`, `seasonal_campaigns`.
- [ ] `<UpgradeGate feature />` renders the kids' surface if accessible, else a contextual upgrade card.
- [ ] Server-side `canAccess` checked in every relevant API route — vitest covers the bypass attempts.
- [ ] Free tier hard limits: 1 household, 3 children, no AI Coach, basic Family Growth Score.

## Out of scope

- Granular per-feature pricing.

## Engineering notes

- `src/components/ui/upgrade-gate.tsx`.
- `src/hooks/use-tier.ts` for client-side reads.

## Implementation log
