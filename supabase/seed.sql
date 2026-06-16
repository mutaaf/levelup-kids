-- LevelUp Kids local seed.
--
-- Empty placeholder for ticket 0001 — the schema lands in ticket 0002 and the
-- first real seed rows in ticket 0008 (quest template library). This file is
-- intentionally non-empty so `psql -f supabase/seed.sql` is a no-op success
-- with `ON_ERROR_STOP=1` in CI rather than an awkward zero-byte file.
SELECT 1 WHERE FALSE;
