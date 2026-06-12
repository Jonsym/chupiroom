-- ChupiRoom — profiles
-- One row per auth user. Populated from sign-up metadata by a trigger, and
-- readable/updatable only by its owner (RLS). No secrets in this file.
--
-- Run in Supabase: SQL Editor → paste → Run (or via the Supabase CLI).

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  first_name  text,
  last_name   text,
  phone       text,
  email       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── Row Level Security: owners only ─────────────────────────────────────────
alter table public.profiles enable row level security;

drop policy if exists "Profiles are selectable by owner" on public.profiles;
create policy "Profiles are selectable by owner"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Profiles are insertable by owner" on public.profiles;
create policy "Profiles are insertable by owner"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── Keep updated_at fresh on every update ───────────────────────────────────
create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_profiles_updated_at();

-- ── Auto-create a profile from sign-up metadata (server-side, RLS-safe) ──────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, phone, email)
  values (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'phone',
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Backfill profiles for users created before this migration ───────────────
insert into public.profiles (id, first_name, last_name, phone, email)
select
  u.id,
  u.raw_user_meta_data ->> 'first_name',
  u.raw_user_meta_data ->> 'last_name',
  u.raw_user_meta_data ->> 'phone',
  u.email
from auth.users u
on conflict (id) do nothing;
