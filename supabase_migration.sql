-- ─────────────────────────────────────────────────────────────────────────────
-- Valuta — Profiles / Sync Token Migration
-- Run this in your Supabase project: SQL Editor → New Query → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Create a public profiles table linked to auth.users
create table public.profiles (
  id          uuid references auth.users not null primary key,
  sync_token  text unique,
  updated_at  timestamp with time zone
);

-- 2. Turn on RLS for the profiles table
alter table public.profiles enable row level security;

-- 3. Allow users to read, insert, and update ONLY their own profile
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- 4. Create a trigger to automatically create a profile + sync token
--    for every new user that signs up going forward
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, sync_token)
  values (
    new.id,
    'val_' || substring(md5(random()::text || clock_timestamp()::text), 1, 15)
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
