-- ============================================================
-- Replica Hub — Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- profiles: extends auth.users with subscription + usage data
create table if not exists public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  email                 text,
  is_subscribed         boolean not null default false,
  subscription_status   text not null default 'inactive',  -- 'active' | 'inactive' | 'canceled' | 'past_due'
  stripe_customer_id    text unique,
  stripe_subscription_id text unique,
  message_count         integer not null default 0,
  message_limit         integer not null default 500,       -- monthly cap
  last_reset_at         timestamptz not null default now(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Row-level security
alter table public.profiles enable row level security;

-- Users can only read/update their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Service role bypasses RLS (used by server-side usage checks)

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Atomic message count increment (avoids race conditions)
create or replace function public.increment_message_count(user_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.profiles
  set message_count = message_count + 1,
      updated_at    = now()
  where id = user_id;
end;
$$;

-- Auto-update updated_at timestamp
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
