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
