# LESSONS.md — operational memory

Append-only. Every autonomous agent (ship, groom, review, eng) reads this at the start of every run and appends a one-line lesson whenever it hits a novel failure mode or takes a healing action.

The point of this file: stop the loop from re-paying for the same debugging pass.

## Format

```
YYYY-MM-DD [agent/phase] SYMPTOM → CAUSE → FIX
```

Examples (see Almanac / CourtIQ / Digital Craft for live versions):
- `2026-05-15 [ship/heal] PR mergeStateStatus: BEHIND despite green CI → branch protection requires up-to-date → gh pr update-branch <n>`
- `2026-05-20 [review] vitest spec named *.spec.ts never ran → vitest.config excludes .spec → rename to *.test.ts`

## Discipline

- Append in chronological order; the newest entry goes at the bottom.
- One line per lesson when possible; two if the cause is non-obvious.
- Don't re-log a known lesson. The groomer dedupes during groom passes.
- Don't reword historical entries. Add a follow-up entry instead.

## Entries

2026-06-16 [eng/heal] CI e2e-tests psql step failed connecting to /var/run/postgresql/.s.PGSQL.5432 even though SUPABASE_DB_URL was set → `supabase status -o env >> $GITHUB_ENV` writes the value with literal quotes (e.g. `SUPABASE_DB_URL="postgresql://..."`), so `psql "$SUPABASE_DB_URL"` expands to `psql '"postgresql://..."'` and psql falls back to the default Unix socket → invoke psql with explicit `-h 127.0.0.1 -p 54322 -U postgres -d postgres` + `PGPASSWORD` env instead of the URL form. Same trap applies to any future `psql "$X"` where X came through GITHUB_ENV via supabase-status.
2026-06-16 [ship/heal] CI unit-tests RLS suite died with `Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL` from supabase-js even though NEXT_PUBLIC_SUPABASE_URL was set → same root cause as the psql lesson above, but for any JS consumer: `supabase status -o env` writes `NAME="value"` lines, GitHub Actions does NOT strip quotes when streaming through $GITHUB_ENV, so process.env.NAME comes back with embedded double quotes and supabase-js's URL validator rejects it. The earlier heal patched the psql consumer; the generalised fix is at the env-capture site → pipe the supabase output through `sed -E 's/^([^=]+)="(.*)"$/\1=\2/'` before `>> "$GITHUB_ENV"`. Apply this to every job that captures via `supabase status -o env`, not just the one currently red.
