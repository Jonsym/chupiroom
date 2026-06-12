-- ChupiRoom — online rooms foundation (rooms + room_players)
-- Works for registered AND anonymous (guest) users: anonymous sign-in issues a
-- JWT with the `authenticated` role, so the policies below cover both.
--
-- Run in Supabase: SQL Editor → paste → Run.

create table if not exists public.rooms (
  id                  uuid primary key default gen_random_uuid(),
  code                text unique not null,
  name                text,
  host_id             uuid not null references auth.users (id) on delete cascade,
  status              text not null default 'waiting' check (status in ('waiting', 'playing', 'finished')),
  selected_card_types text[] not null default '{}',
  play_order          text not null default 'random',
  player_order        text not null default 'sequential',
  max_rounds          int,
  created_at          timestamptz not null default now()
);

create index if not exists rooms_code_idx on public.rooms (code);
create index if not exists rooms_host_idx on public.rooms (host_id);

create table if not exists public.room_players (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid not null references public.rooms (id) on delete cascade,
  user_id      uuid references auth.users (id) on delete set null,
  guest_name   text,
  display_name text not null,
  color        text,
  is_host      boolean not null default false,
  joined_at    timestamptz not null default now(),
  unique (room_id, user_id)
);

create index if not exists room_players_room_idx on public.room_players (room_id);

-- ── Row Level Security ──────────────────────────────────────────────────────
alter table public.rooms enable row level security;
alter table public.room_players enable row level security;

-- rooms: any signed-in user (incl. guests) can read (to look up by code);
-- only the host can create / update / delete their own room.
drop policy if exists "rooms_select" on public.rooms;
create policy "rooms_select" on public.rooms
  for select to authenticated using (true);

drop policy if exists "rooms_insert_own" on public.rooms;
create policy "rooms_insert_own" on public.rooms
  for insert to authenticated with check (auth.uid() = host_id);

drop policy if exists "rooms_update_host" on public.rooms;
create policy "rooms_update_host" on public.rooms
  for update to authenticated using (auth.uid() = host_id) with check (auth.uid() = host_id);

drop policy if exists "rooms_delete_host" on public.rooms;
create policy "rooms_delete_host" on public.rooms
  for delete to authenticated using (auth.uid() = host_id);

-- room_players: signed-in users can read the lobby; you may only insert your own
-- row; your own row (or the host) may update / delete.
drop policy if exists "room_players_select" on public.room_players;
create policy "room_players_select" on public.room_players
  for select to authenticated using (true);

drop policy if exists "room_players_insert_self" on public.room_players;
create policy "room_players_insert_self" on public.room_players
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "room_players_update_self_or_host" on public.room_players;
create policy "room_players_update_self_or_host" on public.room_players
  for update to authenticated
  using (auth.uid() = user_id or auth.uid() = (select r.host_id from public.rooms r where r.id = room_id))
  with check (auth.uid() = user_id or auth.uid() = (select r.host_id from public.rooms r where r.id = room_id));

drop policy if exists "room_players_delete_self_or_host" on public.room_players;
create policy "room_players_delete_self_or_host" on public.room_players
  for delete to authenticated
  using (auth.uid() = user_id or auth.uid() = (select r.host_id from public.rooms r where r.id = room_id));
