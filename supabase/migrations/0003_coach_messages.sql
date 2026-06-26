-- Coach conversation history per household.
-- Each row is one turn (role: user|assistant) with the household FK.

create table if not exists public.coach_messages (
  id bigserial primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists coach_messages_household_idx
  on public.coach_messages(household_id, created_at);

alter table public.coach_messages enable row level security;

-- Service role bypasses RLS; we add a permissive policy for authenticated
-- so future client-side reads (if any) work — but in v1 every Coach call
-- routes through the server action and uses the service role.
create policy coach_messages_select_household
  on public.coach_messages
  for select
  to authenticated
  using (household_id = auth_household_id());

grant select on public.coach_messages to authenticated;
grant all on public.coach_messages to service_role;
grant usage, select on sequence public.coach_messages_id_seq to service_role;
