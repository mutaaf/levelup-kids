---
id: 0002
title: Postgres schema + RLS for households, parents, children, quests, completions, events
status: shipped
priority: P0
area: infra
created: 2026-06-16
owner: gtm-innovation
---

## User story

As a developer (and later an autonomous agent) writing a feature ticket, I want every row in every table protected by RLS such that a parent can read and write only their household's rows, the service role can do everything server-side, and the schema matches `docs/ARCHITECTURE.md §3` exactly — so privacy is by construction, not by review.

## Why now (four lenses)

### Product Owner
The schema is the contract. Every ticket from 0003 onward assumes these tables exist. The smallest meaningful unit of value: a migration set that runs cleanly on a fresh `supabase db reset` AND every table has at least one positive and one negative RLS test in vitest before any feature builds on top of it.

### Stakeholder
Children's data minimalism is the privacy moat. Putting RLS in the first schema migration means the first time someone adds a field on `children` they have to think about who can read it, not the third. The `events` table seeded in v1.0 means v1.1's PostHog migration is "ingest, not instrument."

### User (in the real moment of use)
The user feels this when they don't experience a breach. The score is, in the long run, trust.

### Growth
A trustworthy-by-construction privacy posture is part of the founder's essay (`docs/GTM.md §4`). The "we don't collect what we don't need" line is true because the schema enforces it.

## Acceptance criteria

Each box maps 1:1 to a vitest scenario in `tests/db/rls.test.ts`.

- [ ] Migration `supabase/migrations/0001_init.sql` creates the six tables in `docs/ARCHITECTURE.md §3` with the exact column names, types, defaults, and check constraints listed there.
- [ ] Running `supabase db reset` on a fresh CLI brings the schema up with zero errors.
- [ ] `src/types/database.ts` is generated from the schema (`supabase gen types typescript --local`) and committed.
- [ ] RLS is `enabled` on every table (`pg_class.relrowsecurity = true` query in the test confirms it).
- [ ] A parent authenticated as `auth.uid() = X` can SELECT from `households` where they belong (`parents.household_id` link). Two RLS tests: positive (own household) returns the row; negative (another household) returns zero rows.
- [ ] A parent cannot UPDATE another household's `name` (RLS returns 0 rows affected without raising an error).
- [ ] A parent can INSERT a `child` row only where `household_id` matches their own. Cross-household insert is denied.
- [ ] A parent can mark a `quest_completion` `approved_by = self.id` only when the quest's child belongs to their household.
- [ ] `quest_completions.xp_awarded` cannot be updated after `approved_at IS NOT NULL` (a Postgres rule or trigger; tested by attempting an update and asserting it raised).
- [ ] Service role bypasses RLS (positive test: service-role client reads any household's rows).
- [ ] The `events` table accepts inserts from the service role only; client inserts are denied.
- [ ] `pillars` is NOT a database table — it's a TypeScript enum in `src/lib/types/pillar.ts` exporting the 8-string union type and a `PILLARS` const array. The DB uses the string check constraint on `pillar` columns.
- [ ] `helper-fn-tests/helpers.test.ts`: `pillarSlugSchema` (zod) validates each of the 8 pillars and rejects unknowns.

## Out of scope

- Seeding `quest_templates` rows (that's ticket 0008).
- Any UI on top of the schema (0003+).
- Backups, point-in-time recovery, replication. Supabase manages this.
- Multi-tenancy beyond the household level. There's no "organization" or "group of households" in v1.

## Engineering notes

- Single migration file: `supabase/migrations/0001_init.sql`. Idempotent enough to re-apply via `supabase db reset` cleanly.
- Use `auth.uid()` in RLS policies. Pattern: `using (household_id = (select household_id from parents where id = auth.uid()))`.
- For the `xp_awarded` immutability: a trigger function `prevent_xp_change_after_approval()` returning a `BEFORE UPDATE` raise on `OLD.approved_at IS NOT NULL AND NEW.xp_awarded <> OLD.xp_awarded`.
- Test infra: install `@supabase/supabase-js` and create two helper clients in `tests/db/helpers.ts` — `serviceClient()` (service role) and `userClient(userId)` (sets `auth.uid()` via JWT-mock for RLS tests).
- New deps: none beyond what 0001 installed.
- Migration version: `0001` (this is the first numbered migration).
- Privacy/security surface change: yes — this is THE privacy surface. The reviewer should be extra-strict on the RLS test coverage.

## Implementation log

- 2026-06-16 [implementation-dev] Picked up on `feat/0002-schema-rls`. Plan: write failing `tests/db/rls.test.ts` against a local Supabase (skip-gracefully if `NEXT_PUBLIC_SUPABASE_URL` not set so local devs without Docker get a soft signal; CI gates by wiring `supabase start` into the `unit-tests` job). Write `supabase/migrations/0001_init.sql` to match `docs/ARCHITECTURE.md §3` verbatim plus RLS policies + the `prevent_xp_change_after_approval()` trigger. Implement `pillarSlugSchema` in `src/lib/types/pillar.ts` as a hand-rolled zod-shaped validator (zod is NOT in the dep set per the engineering note "no new deps beyond what 0001 installed"; the `pillarSlugSchema` (zod) phrasing in the AC is read as "zod-style schema", not "import zod").
- 2026-06-16 [implementation-dev] Index drift on 0001 (status was `in-progress` in both the ticket file and the README despite PRs #1 and #2 having merged) folded into this PR per the ship prompt's PHASE 2 instruction.
- 2026-06-17 [implementation-dev/0003] Status drift heal: this ticket merged in c5b525b (PR #3) but the frontmatter + README index row were never flipped from `in-progress` to `shipped`. Corrected in the same branch as the 0003 work per AGENTS.md "fix that index row as part of your branch."
