---
id: 0025
title: PostHog wiring — events table to PostHog ingestion + dashboards
status: proposed
priority: P2
area: analytics
created: 2026-06-16
owner: gtm-innovation
---

## User story

As the founder reviewing v1.1 retention metrics, I want every event already written to the `events` table since v1.0 to be ingested into PostHog with backfill, plus a set of named PostHog dashboards (D1, W1, conversion, Coach usage, churn) — so the metrics in `docs/GTM.md §7` are queryable on day 1 of v1.1.

## Why now (four lenses)

### Product Owner
The `events` table from v1.0 was the *seed*. This ticket harvests it.

### Stakeholder
Server-side event ingestion (vs PostHog's client JS SDK) keeps the privacy posture — no third-party trackers fire on page load. v1.0's promise holds.

### User (in the real moment of use)
The user never sees PostHog. The founder sees clearer decisions.

### Growth
The PostHog dashboards drive every v1.2 ticket prioritization.

## Proposed acceptance criteria (gtm-innovation to groom)

- [ ] Server-side ingestion via PostHog's HTTP capture API — no JS SDK on the client.
- [ ] Supabase Edge Function `events-to-posthog` runs every 5 minutes, flushes new rows.
- [ ] Backfill script for historical events.
- [ ] 5 named PostHog dashboards: D1 retention, W1 retention, Free→Premium conversion, Coach usage, Monthly churn.

## Out of scope

- Client-side PostHog SDK. Hard NO.
- Heatmaps, session replay.

## Engineering notes

- `POSTHOG_API_KEY` env var.

## Implementation log
