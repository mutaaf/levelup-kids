-- Per-household custom quests. Parents create their own quests on top of
-- the global seed library (src/lib/quests/seed-library.ts). Selector mixes
-- both pools, filters by child age, and assigns daily quests as before.

create table if not exists public.household_quests (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  description text not null default '',
  pillar text not null check (pillar in (
    'scholar','athlete','builder','creator','leader','character','explorer','purpose'
  )),
  age_min int not null default 4 check (age_min between 4 and 17),
  age_max int not null default 17 check (age_max between 4 and 17),
  xp_reward int not null default 5 check (xp_reward between 1 and 50),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint household_quests_age_order check (age_min <= age_max)
);

create index if not exists household_quests_household_idx
  on public.household_quests(household_id, is_active);

alter table public.household_quests enable row level security;

-- Authenticated parents can read/write their own household's custom quests.
create policy household_quests_select_household
  on public.household_quests
  for select
  to authenticated
  using (household_id = auth_household_id());

create policy household_quests_insert_household
  on public.household_quests
  for insert
  to authenticated
  with check (household_id = auth_household_id());

create policy household_quests_update_household
  on public.household_quests
  for update
  to authenticated
  using (household_id = auth_household_id())
  with check (household_id = auth_household_id());

create policy household_quests_delete_household
  on public.household_quests
  for delete
  to authenticated
  using (household_id = auth_household_id());

grant select, insert, update, delete on public.household_quests to authenticated;
grant all on public.household_quests to service_role;

-- updated_at trigger (reuse the pattern from household_secrets if present,
-- else inline a small function).
create or replace function public.touch_household_quests()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_household_quests on public.household_quests;
create trigger trg_touch_household_quests
  before update on public.household_quests
  for each row execute function public.touch_household_quests();
