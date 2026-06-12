-- ChupiRoom — enable Supabase Realtime for online gameplay tables.
-- Adds room_state + room_votes to the `supabase_realtime` publication so
-- clients can subscribe to Postgres changes. RLS still applies to subscribers
-- (the existing SELECT policies are `using (true)` for authenticated users).
--
-- Idempotent: safe to run more than once.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'room_state'
  ) then
    alter publication supabase_realtime add table public.room_state;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'room_votes'
  ) then
    alter publication supabase_realtime add table public.room_votes;
  end if;
end $$;
