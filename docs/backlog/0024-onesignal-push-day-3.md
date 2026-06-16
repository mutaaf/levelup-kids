---
id: 0024
title: OneSignal push notifications opted-in on day 3, not day 1
status: proposed
priority: P2
area: notifications
created: 2026-06-16
owner: gtm-innovation
---

## User story

As Imran on day 3 of using the app, I want one calm in-app prompt — "Want a nudge when Layla marks a quest ready?" — that asks for push permission with clear value, not the OS prompt on first launch — so I say yes because I want it, not because I haven't yet learned to dismiss it.

## Why now (four lenses)

### Product Owner
Day-3 opt-in beats day-1 opt-in by 3-5x. The simplification: one trigger, one prompt, one OS dialog.

### Stakeholder
Push is the comeback hook for the week-2 churn risk. Without it, the loop dies.

### User (in the real moment of use)
Imran taps "Yes, nudge me." iOS asks system permission. He grants. Two hours later, Layla marks ready. He gets one notification.

### Growth
Push delivery rate × open rate × week-2 retention is the v1.1 leverage point.

## Proposed acceptance criteria (gtm-innovation to groom)

- [ ] OneSignal SDK loaded only on the (app) layout, not on the marketing route.
- [ ] Prompt shown only on session ≥ 3 and not previously dismissed.
- [ ] Notification triggers: quest marked ready, weekly mission seeded Monday morning, streak about to break (day 6 of a 7-day streak with no completion).
- [ ] Quiet hours: no notifications 9pm–7am household local time.

## Out of scope

- Email notifications (covered by 0026 weekly recap).
- SMS.

## Engineering notes

- New env var `ONESIGNAL_APP_ID`, `ONESIGNAL_REST_API_KEY`.
- Server-side notification triggers via webhook from Supabase functions.

## Implementation log
