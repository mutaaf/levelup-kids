-- LevelUp Kids v1.0 — schema + RLS.
--
-- Authoritative source: docs/ARCHITECTURE.md §3. Column names, types,
-- defaults, and check constraints below must match that section verbatim.
-- The two are tied: if you change one, change both, and run the RLS test
-- suite (`tests/db/rls.test.ts`) before pushing.
--
-- RLS contract (also in §3 of the architecture doc):
--   - A parent reads/writes only their household's rows.
--   - The service role bypasses RLS (Supabase default for the
--     service_role JWT).
--   - The `events` table is server-only: client INSERT/SELECT are denied.
--
-- Idempotency: the file is designed to run cleanly under
-- `supabase db reset` (which drops + recreates the database from scratch).
-- A `DROP ... IF EXISTS` prefix is not used because reset already does it
-- and bare `CREATE` makes drift loud.

-- =========================================================================
-- Extensions
-- =========================================================================

-- `gen_random_uuid()` ships under `pgcrypto`. Supabase enables this by
-- default but we declare it explicitly so a fresh self-hosted Postgres
-- works too.
create extension if not exists pgcrypto;

-- =========================================================================
-- Tables (docs/ARCHITECTURE.md §3 verbatim)
-- =========================================================================

create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subscription_tier text not null default 'free'
    check (subscription_tier in ('free', 'premium')),
  focus_pillars text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table parents (
  id uuid primary key,                   -- matches auth.users.id
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null default 'parent'
    check (role in ('admin', 'parent')),
  created_at timestamptz not null default now()
);

create index parents_household_idx on parents(household_id);

create table children (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  age int not null check (age between 4 and 17),
  avatar text not null,
  created_at timestamptz not null default now()
);

create index children_household_idx on children(household_id);

create table quest_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  pillar text not null check (pillar in (
    'scholar','athlete','builder','creator','leader','character','explorer','purpose'
  )),
  type text not null check (type in ('daily','weekly','monthly')),
  difficulty int not null default 1 check (difficulty between 1 and 3),
  xp_reward int not null,
  min_age int not null default 4,
  max_age int not null default 17
);

create table quests (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  template_id uuid references quest_templates(id),
  title text not null,
  description text not null,
  pillar text not null check (pillar in (
    'scholar','athlete','builder','creator','leader','character','explorer','purpose'
  )),
  type text not null check (type in ('daily','weekly','monthly')),
  difficulty int not null default 1,
  xp_reward int not null,
  assigned_for date not null,
  created_at timestamptz not null default now()
);

create index quests_child_idx on quests(child_id);
create index quests_assigned_for_idx on quests(assigned_for);

create table quest_completions (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references quests(id) on delete cascade,
  child_id uuid not null references children(id) on delete cascade,
  completed_at timestamptz not null default now(),
  approved_by uuid references parents(id),
  approved_at timestamptz,
  xp_awarded int not null default 0,
  unique (quest_id)
);

create index quest_completions_child_idx on quest_completions(child_id);

create table events (
  id bigserial primary key,
  household_id uuid references households(id) on delete set null,
  parent_id uuid references parents(id) on delete set null,
  child_id uuid references children(id) on delete set null,
  name text not null,
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index events_household_idx on events(household_id);
create index events_name_idx on events(name);

-- =========================================================================
-- Trigger: xp_awarded is immutable once approved_at is set
-- =========================================================================
--
-- This is the privacy-by-construction guard the ticket calls out
-- explicitly: once a quest completion is approved and XP is granted, the
-- score for the trailing 28-day window can't be retroactively edited.
-- The trigger fires for the service role too (it's not an RLS policy) —
-- by design, since the service role is the only path that ever sets
-- approved_at in v1.0.

create or replace function prevent_xp_change_after_approval()
returns trigger
language plpgsql
as $$
begin
  if old.approved_at is not null and new.xp_awarded is distinct from old.xp_awarded then
    raise exception
      'xp_awarded is immutable after approved_at is set (completion=%, old=%, new=%)',
      old.id, old.xp_awarded, new.xp_awarded
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger quest_completions_xp_immutable
before update on quest_completions
for each row
execute function prevent_xp_change_after_approval();

-- =========================================================================
-- Row-Level Security
-- =========================================================================
--
-- Pattern (per ticket 0002 engineering notes):
--   using (household_id = (select household_id from parents where id = auth.uid()))
--
-- Notes:
--   - `auth.uid()` returns the `sub` claim of the JWT, cast to uuid.
--   - The subquery is fast: parents.id is the PK, so it's an index lookup.
--   - The service role JWT carries role=service_role and bypasses RLS by
--     default in Supabase. We don't need a "service role can do anything"
--     policy.
--   - `events` is server-only. NO policy is added that lets clients touch
--     it; with RLS enabled and zero policies, the default is deny.

alter table households         enable row level security;
alter table parents            enable row level security;
alter table children           enable row level security;
alter table quest_templates    enable row level security;
alter table quests             enable row level security;
alter table quest_completions  enable row level security;
alter table events             enable row level security;

-- ---- households ---------------------------------------------------------
create policy households_select_own
  on households for select
  to authenticated
  using (id = (select household_id from parents where id = auth.uid()));

create policy households_update_own
  on households for update
  to authenticated
  using (id = (select household_id from parents where id = auth.uid()))
  with check (id = (select household_id from parents where id = auth.uid()));

-- Households are created server-side via the onboarding API
-- (`createServiceSupabase()` bypasses RLS); no client INSERT policy.

-- ---- parents ------------------------------------------------------------
-- A parent can see their co-parents in the same household. INSERT/UPDATE
-- of parents rows happens via service-role onboarding endpoints in v1.0
-- (no client policy needed).
create policy parents_select_household
  on parents for select
  to authenticated
  using (household_id = (select household_id from parents p2 where p2.id = auth.uid()));

-- ---- children -----------------------------------------------------------
create policy children_select_household
  on children for select
  to authenticated
  using (household_id = (select household_id from parents where id = auth.uid()));

create policy children_insert_household
  on children for insert
  to authenticated
  with check (household_id = (select household_id from parents where id = auth.uid()));

create policy children_update_household
  on children for update
  to authenticated
  using (household_id = (select household_id from parents where id = auth.uid()))
  with check (household_id = (select household_id from parents where id = auth.uid()));

create policy children_delete_household
  on children for delete
  to authenticated
  using (household_id = (select household_id from parents where id = auth.uid()));

-- ---- quest_templates ----------------------------------------------------
-- Templates are global (the seed library, ticket 0008). Anyone signed in
-- can read. Writes are server-only.
create policy quest_templates_select_all
  on quest_templates for select
  to authenticated
  using (true);

-- ---- quests -------------------------------------------------------------
create policy quests_select_household
  on quests for select
  to authenticated
  using (child_id in (
    select id from children
    where household_id = (select household_id from parents where id = auth.uid())
  ));

create policy quests_insert_household
  on quests for insert
  to authenticated
  with check (child_id in (
    select id from children
    where household_id = (select household_id from parents where id = auth.uid())
  ));

create policy quests_update_household
  on quests for update
  to authenticated
  using (child_id in (
    select id from children
    where household_id = (select household_id from parents where id = auth.uid())
  ))
  with check (child_id in (
    select id from children
    where household_id = (select household_id from parents where id = auth.uid())
  ));

create policy quests_delete_household
  on quests for delete
  to authenticated
  using (child_id in (
    select id from children
    where household_id = (select household_id from parents where id = auth.uid())
  ));

-- ---- quest_completions --------------------------------------------------
create policy quest_completions_select_household
  on quest_completions for select
  to authenticated
  using (child_id in (
    select id from children
    where household_id = (select household_id from parents where id = auth.uid())
  ));

-- The child marks ready via a service-role endpoint (no auth row on the
-- child), so we don't need a client INSERT policy. But parents do approve
-- via UPDATE — that's the daily-loop write.
create policy quest_completions_update_household
  on quest_completions for update
  to authenticated
  using (child_id in (
    select id from children
    where household_id = (select household_id from parents where id = auth.uid())
  ))
  with check (
    child_id in (
      select id from children
      where household_id = (select household_id from parents where id = auth.uid())
    )
    and (approved_by is null or approved_by = auth.uid())
  );

-- =========================================================================
-- Role grants — explicit, not relying on ALTER DEFAULT PRIVILEGES
-- =========================================================================
--
-- Supabase's hosted setup applies default privileges to public.* tables
-- created by migrations, but `supabase/setup-cli@v1 + supabase start` in
-- CI does not — newly created tables have NO grants and every role
-- (including service_role) gets `permission denied for table`.
--
-- RLS still does the per-row gating for `authenticated`; `service_role`
-- bypasses RLS by design (Supabase wires this through PostgREST), so
-- granting it full DML on every table is the correct + intentional shape.
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

-- =========================================================================
-- Test helper RPCs (used by tests/db/rls.test.ts)
-- =========================================================================
--
-- These let the test suite assert "RLS is enabled on every public table"
-- and "the six tables exist" without bouncing off the information_schema
-- RLS rules (which differ across Postgres versions). They're safe to ship
-- because they only read pg_catalog metadata.

create or replace function levelup_test_table_names()
returns setof text
language sql
security definer
set search_path = pg_catalog, public
as $$
  select c.relname::text
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
  order by c.relname;
$$;

create or replace function levelup_test_rls_status()
returns table(table_name text, rls_enabled boolean)
language sql
security definer
set search_path = pg_catalog, public
as $$
  select c.relname::text, c.relrowsecurity
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
  order by c.relname;
$$;

grant execute on function levelup_test_table_names() to anon, authenticated, service_role;
grant execute on function levelup_test_rls_status() to anon, authenticated, service_role;
