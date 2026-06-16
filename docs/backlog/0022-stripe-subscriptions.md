---
id: 0022
title: Stripe subscriptions — Free vs Premium $9.99/mo and $84/yr
status: proposed
priority: P1
area: billing
created: 2026-06-16
owner: gtm-innovation
---

## User story

As Imran (free user who just had the AI Coach answer his question on a friend's account), I want to upgrade to Premium from `/settings/subscription` in two taps — pick monthly or annual, enter card, redirect to a Stripe-hosted checkout — and land back on the parent dashboard with the Premium badge visible — so unlocking the Coach for my own family is one minute, not ten.

## Why now (four lenses)

### Product Owner
Premium is the business. The simplification: Stripe Checkout for the upgrade path, Stripe Customer Portal for cancellation. No custom card form. No add-ons.

### Stakeholder
Webhook signature verification is the *trust boundary* for billing. If it leaks, anyone can mint Premium. This ticket is half UI, half webhook-hardening.

### User (in the real moment of use)
Imran upgrades during a 2-minute window of clarity. If the upgrade takes more than 60 seconds, he closes the tab.

### Growth
Free→Premium conversion is the v1.1 KPI. The pricing copy ("Less than a single tutoring session, every month") is part of the GTM thesis.

## Proposed acceptance criteria (gtm-innovation to groom)

- [ ] `/settings/subscription` shows current plan + upgrade CTA for free users.
- [ ] Stripe Checkout session via `/api/stripe/checkout`.
- [ ] Webhook `/api/stripe/webhook` verifies signature (fail-closed if `STRIPE_WEBHOOK_SECRET` unset → 503).
- [ ] Webhook handles `customer.subscription.created/updated/deleted` → updates `households.subscription_tier`.
- [ ] vitest covers happy path, missing-signature 400, invalid-signature 400, missing-secret 503.

## Out of scope

- Free trial of Premium (just upgrade and downgrade).
- Family plan beyond one household.

## Engineering notes

- `getStripe()` is LAZY (no module-top instantiation).
- `STRIPE_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY` env vars.
- New table `subscription_events` for webhook audit.

## Implementation log
