---
id: 0026
title: Weekly recap email — the comeback hook for week-2 churn
status: proposed
priority: P1
area: growth-loop
created: 2026-06-16
owner: gtm-innovation
---

## User story

As Sara (Monday morning), I want one email — "The Aziz Family · Last week's growth" — with the Family Growth Score radar inline, the top quest per child, and one specific suggestion for next week — so I open the app even when I haven't thought about it for two days.

## Why now (four lenses)

### Product Owner
The recap is the *single* lifecycle email in v1.1. The simplification: Monday morning, household-level, one composition.

### Stakeholder
The recap is the surface a parent forwards to a co-parent or a friend. Composition matters.

### User (in the real moment of use)
Sara, Monday 7am. She skims the email. The radar fills two pillars. She taps "see this week's plan" — direct link to the parent dashboard, signed-in.

### Growth
Week-2 churn is the biggest risk. The recap is the answer.

## Proposed acceptance criteria (gtm-innovation to groom)

- [ ] Email composed via React Email (server-rendered).
- [ ] Sent Monday 8am household local time.
- [ ] One-tap unsubscribe (separate from auth-email opt-out).
- [ ] Score radar rendered as inline SVG (no PNG generation needed for v1.1).
- [ ] Sent via Resend or similar (no v1 SMTP).

## Out of scope

- Per-child recap.
- Daily recap.

## Engineering notes

- `RESEND_API_KEY` env var.
- New deps: `@react-email/components`, `react-email`.

## Implementation log
