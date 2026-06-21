-- Household display tokens — opaque pairing strings the parent generates in
-- Settings, then opens on an iPad / Echo Show / shared screen. The token IS
-- the auth: anyone with the URL can view the household's leaderboard.
--
-- Same security model as a shared calendar link. Parents can list, label,
-- and revoke tokens from /settings.

create table if not exists public.household_display_tokens (
  token text primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  label text,
  created_by uuid references public.parents(id) on delete set null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  revoked_at timestamptz
);

create index if not exists household_display_tokens_household_idx
  on public.household_display_tokens(household_id, created_at desc);

alter table public.household_display_tokens enable row level security;

-- Authenticated parents can READ their own household's tokens (for the
-- Settings list). They CANNOT see other households' tokens.
create policy household_display_tokens_select_household
  on public.household_display_tokens
  for select
  to authenticated
  using (household_id = auth_household_id());

-- Writes (create / revoke) happen via server actions using the service role,
-- so no insert/update/delete policy is needed for authenticated.

revoke insert, update, delete on public.household_display_tokens from anon, authenticated;
grant select on public.household_display_tokens to authenticated;
grant all on public.household_display_tokens to service_role;
