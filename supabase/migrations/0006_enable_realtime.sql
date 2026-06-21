-- Enable realtime broadcasting on quest_completions.
--
-- This lets the household-display surface (src/app/display/[token]/page.tsx +
-- src/components/display/DisplayRealtime.tsx) subscribe to INSERT/UPDATE
-- events and fire the celebration animation the moment a parent approves a
-- quest from their phone. Without this publication entry, the display would
-- still work via the 30s polling fallback but lose the live moment.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'quest_completions'
  ) then
    alter publication supabase_realtime add table public.quest_completions;
  end if;
end$$;
