-- Per-child earned achievements. Achievement definitions live in TS
-- (src/lib/achievements/badges.ts) so they're versioned + readable.
-- Earning is recorded here; UI reads back via the child_id index.
--
-- Idempotent: unique(child_id, badge_id) — re-running the awarder is safe.

create table if not exists public.child_achievements (
  id bigserial primary key,
  child_id uuid not null references public.children(id) on delete cascade,
  badge_id text not null,
  earned_at timestamptz not null default now(),
  unique (child_id, badge_id)
);

create index if not exists child_achievements_child_idx
  on public.child_achievements(child_id, earned_at desc);

alter table public.child_achievements enable row level security;

create policy child_achievements_select_household
  on public.child_achievements
  for select
  to authenticated
  using (
    child_id in (
      select id from public.children
      where household_id = auth_household_id()
    )
  );

grant select on public.child_achievements to authenticated;
grant all on public.child_achievements to service_role;
grant usage, select on sequence public.child_achievements_id_seq to service_role;
