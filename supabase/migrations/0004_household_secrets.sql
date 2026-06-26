-- Per-household secrets — currently just the BYOK Anthropic key for the
-- AI Family Coach. Kept in a SEPARATE table from households so we never
-- accidentally leak it via an existing households SELECT policy.
--
-- Design: no RLS policy for authenticated. Service role only. Every UI
-- read comes through a server action that masks the value before returning
-- it to the client (we never send the raw key over the wire after save).

create table if not exists public.household_secrets (
  household_id uuid primary key references public.households(id) on delete cascade,
  anthropic_api_key text,
  updated_at timestamptz not null default now()
);

alter table public.household_secrets enable row level security;

-- No CREATE POLICY for authenticated → all authenticated reads/writes are denied by RLS.
-- Belt-and-braces: explicit GRANT/REVOKE so even bypassing-RLS misconfigurations fail.
revoke all on public.household_secrets from anon, authenticated, public;
grant all on public.household_secrets to service_role;

-- updated_at trigger
create or replace function public.touch_household_secrets()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_household_secrets on public.household_secrets;
create trigger trg_touch_household_secrets
  before update on public.household_secrets
  for each row execute function public.touch_household_secrets();
