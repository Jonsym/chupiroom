-- ChupiRoom — online gameplay sync (room_state + room_votes)
-- Host is the source of truth: it pushes a renderable snapshot to room_state;
-- everyone else polls it. Votes for Votaciones go to room_votes.
-- Covers registered AND anonymous (guest) users (role `authenticated`).
--
-- Run in Supabase: SQL Editor → paste → Run.

create table if not exists public.room_state (
  room_id         uuid primary key references public.rooms (id) on delete cascade,
  status          text not null default 'playing' check (status in ('waiting', 'playing', 'finished')),
  round           int not null default 1,
  turn_index      int not null default 0,
  current_card_id text,
  snapshot        jsonb not null default '{}',
  updated_at      timestamptz not null default now()
);

create table if not exists public.room_votes (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references public.rooms (id) on delete cascade,
  turn_index  int not null,
  voter_id    uuid not null references auth.users (id) on delete cascade,
  voted_name  text not null,
  created_at  timestamptz not null default now(),
  unique (room_id, turn_index, voter_id)
);

create index if not exists room_votes_room_turn_idx on public.room_votes (room_id, turn_index);

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.room_state enable row level security;
alter table public.room_votes enable row level security;

-- room_state: anyone signed-in can read; only the room host can write.
drop policy if exists "room_state_select" on public.room_state;
create policy "room_state_select" on public.room_state
  for select to authenticated using (true);

drop policy if exists "room_state_insert_host" on public.room_state;
create policy "room_state_insert_host" on public.room_state
  for insert to authenticated
  with check (auth.uid() = (select r.host_id from public.rooms r where r.id = room_id));

drop policy if exists "room_state_update_host" on public.room_state;
create policy "room_state_update_host" on public.room_state
  for update to authenticated
  using (auth.uid() = (select r.host_id from public.rooms r where r.id = room_id))
  with check (auth.uid() = (select r.host_id from public.rooms r where r.id = room_id));

drop policy if exists "room_state_delete_host" on public.room_state;
create policy "room_state_delete_host" on public.room_state
  for delete to authenticated
  using (auth.uid() = (select r.host_id from public.rooms r where r.id = room_id));

-- room_votes: anyone signed-in can read the tally; you may only insert your own vote.
drop policy if exists "room_votes_select" on public.room_votes;
create policy "room_votes_select" on public.room_votes
  for select to authenticated using (true);

drop policy if exists "room_votes_insert_self" on public.room_votes;
create policy "room_votes_insert_self" on public.room_votes
  for insert to authenticated with check (auth.uid() = voter_id);
