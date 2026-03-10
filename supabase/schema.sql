-- ============================================================
-- Replica Hub — Supabase Schema
-- Aligned with deepvortex-hub profiles table (credits model)
-- Run this in your Supabase SQL Editor
-- ============================================================

-- profiles: extends auth.users — shared with all deepvortex tools
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text,
  full_name       text,
  avatar_url      text,
  credits         integer not null default 2,          -- starts with 2 free credits
  stripe_customer_id text unique,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Row-level security
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup (2 free credits)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, credits)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    2
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Atomic credit decrement (called after each successful chat message)
create or replace function public.decrement_credits(user_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.profiles
  set credits    = greatest(0, credits - 1),
      updated_at = now()
  where id = user_id;
end;
$$;

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();
