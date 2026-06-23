-- Co-parent invites. A parent in a household generates an invite that
-- another parent claims by visiting /invite/{token} while signed in.
-- The accepter joins the inviter's household as role=parent.

create table if not exists public.household_invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  household_id uuid not null references public.households(id) on delete cascade,
  invited_by uuid references public.parents(id) on delete set null,
  email text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_by uuid references public.parents(id) on delete set null,
  revoked_at timestamptz
);

create index if not exists household_invites_household_idx
  on public.household_invites(household_id, created_at desc);
create index if not exists household_invites_token_idx
  on public.household_invites(token);

alter table public.household_invites enable row level security;

-- Parents in the household can see/cancel their pending invites.
create policy household_invites_select_household
  on public.household_invites
  for select
  to authenticated
  using (household_id = auth_household_id());

grant select on public.household_invites to authenticated;
grant all on public.household_invites to service_role;
