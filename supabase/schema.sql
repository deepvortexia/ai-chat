-- ============================================================
-- Replica Hub — Supabase Schema (Subscription Model)
-- Run this in your Supabase SQL Editor
-- ============================================================

-- profiles table
create table if not exists public.profiles (
  id                     uuid primary key references auth.users(id) on delete cascade,
  email                  text,
  full_name              text,
  avatar_url             text,
  -- Subscription fields
  is_subscribed          boolean not null default false,
  subscription_status    text not null default 'inactive',  -- 'active' | 'inactive' | 'canceled'
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  -- Usage tracking (trial + analytics)
  message_count          integer not null default 0,
  -- Hub credits (shared with other deepvortex tools)
  credits                integer not null default 2,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Increment message_count after each successful chat message
create or replace function public.increment_message_count(user_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.profiles
  set message_count = message_count + 1,
      updated_at    = now()
  where id = user_id;
end;
$$;

-- Called by Stripe webhook when subscription becomes active
create or replace function public.activate_subscription(
  p_user_id              uuid,
  p_stripe_customer_id   text,
  p_stripe_sub_id        text
)
returns void language plpgsql security definer as $$
begin
  update public.profiles
  set is_subscribed          = true,
      subscription_status    = 'active',
      stripe_customer_id     = p_stripe_customer_id,
      stripe_subscription_id = p_stripe_sub_id,
      updated_at             = now()
  where id = p_user_id;
end;
$$;

-- Called by Stripe webhook on cancellation / payment failure
create or replace function public.deactivate_subscription(p_user_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.profiles
  set is_subscribed       = false,
      subscription_status = 'canceled',
      updated_at          = now()
  where id = p_user_id;
end;
$$;

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create or replace trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();
