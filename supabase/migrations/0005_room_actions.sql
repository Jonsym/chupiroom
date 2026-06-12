-- ChupiRoom — per-player online actions (e.g. the current player's Verdad o Toma outcome).
-- The host runs the engine; a non-host *current player* records their action here and
-- the host consumes it to advance. One action per card (unique room_id + turn_index)
-- prevents duplicate submissions. Covers registered + anonymous (guest) users.
--
-- Run in Supabase: SQL Editor → paste → Run.

create table if not exists public.room_actions (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references public.rooms (id) on delete cascade,
  turn_index  int not null,
  user_id     uuid not null references auth.users (id) on delete cascade,
  action      text not null check (action in ('answered', 'drank')),
  created_at  timestamptz not null default now(),
  unique (room_id, turn_index)
);

create index if not exists room_actions_room_turn_idx on public.room_actions (room_id, turn_index);

alter table public.room_actions enable row level security;

drop policy if exists "room_actions_select" on public.room_actions;
create policy "room_actions_select" on public.room_actions
  for select to authenticated using (true);

drop policy if exists "room_actions_insert_self" on public.room_actions;
create policy "room_actions_insert_self" on public.room_actions
  for insert to authenticated with check (auth.uid() = user_id);

-- Realtime so the host hears the current player's action instantly.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'room_actions'
  ) then
    alter publication supabase_realtime add table public.room_actions;
  end if;
end $$;
