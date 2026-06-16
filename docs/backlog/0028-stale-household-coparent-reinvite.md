---
id: 0028
title: Stale-household co-parent re-invite — day 7 nudge if only 1 parent active
status: proposed
priority: P2
area: growth-loop
created: 2026-06-16
owner: gtm-innovation
---

## User story

As Imran (only active parent, day 7 since household creation), I want a calm in-app nudge — "Sara never finished signing in. Send her a fresh invite?" — with the one-tap action — so the second-parent activation that didn't happen at onboarding gets one well-timed second chance.

## Why now (four lenses)

### Product Owner
Co-parent activation in households where only one parent is active is the highest-leverage retention lever (`docs/GTM.md §7`).

### Stakeholder
A household with two active parents has 3x the retention of one with one. This ticket directly addresses the top moat-deepener.

### User (in the real moment of use)
Imran sees the card at the top of the dashboard on his 7th-day open. He taps "Send to Sara." The fresh invite goes; the card disappears.

### Growth
Direct contribution to co-parent-activation KPI.

## Proposed acceptance criteria (gtm-innovation to groom)

- [ ] Daily Supabase function checks for households with only 1 parent active.
- [ ] On day 7, the parent dashboard shows the re-invite card.
- [ ] On dismiss, hidden for 14 days.
- [ ] On resend, a fresh invite via 0005's flow.

## Out of scope

- Email-based re-engagement of the never-signed-in invitee (separate ticket).

## Engineering notes

- New scheduled Edge Function `coparent-stale-check`.

## Implementation log
