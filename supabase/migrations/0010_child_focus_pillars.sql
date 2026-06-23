-- Per-child focus pillars (replaces household-level focus_pillars as the
-- load-bearing model for scoring + quest selection). Each kid now picks
-- their own 2-4 pillars to work on this month.
--
-- households.focus_pillars stays on the row as a soft default — used when
-- a new kid is added without explicit pillars, and as the seed values
-- during onboarding. It's no longer the source of truth for the score.
--
-- Backfill: every existing child inherits its household's focus_pillars
-- so today's parents see the same radar shape they had yesterday. They
-- can edit per-child in Settings whenever they want.

alter table public.children
  add column if not exists focus_pillars text[] not null default '{}';

-- Backfill existing children from their household's focus_pillars. Keep
-- this idempotent so re-running the migration is safe.
update public.children
   set focus_pillars = coalesce(h.focus_pillars, '{}')
  from public.households h
 where children.household_id = h.id
   and (children.focus_pillars is null or array_length(children.focus_pillars, 1) is null);
