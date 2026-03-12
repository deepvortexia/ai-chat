-- ============================================================
-- Migration 001: Add subscription fields + usage tracking
-- Applies to: existing profiles table that only has
--   id, email, full_name, avatar_url, credits, created_at, updated_at
-- ============================================================

-- ── Add missing columns ──────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists is_subscribed          boolean      not null default false,
  add column if not exists subscription_status    text         not null default 'inactive',
  add column if not exists stripe_customer_id     text,
  add column if not exists stripe_subscription_id text,
  add column if not exists message_count          integer      not null default 0,
  add column if not exists last_reset_at          timestamptz  not null default now();

-- Unique indexes for Stripe IDs (only if they don't already exist)
create unique index if not exists profiles_stripe_customer_id_key
  on public.profiles(stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists profiles_stripe_subscription_id_key
  on public.profiles(stripe_subscription_id)
  where stripe_subscription_id is not null;

-- ── increment_message_count ──────────────────────────────────────────────────
create or replace function public.increment_message_count(user_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.profiles
  set message_count = message_count + 1,
      updated_at    = now()
  where id = user_id;
end;
$$;

-- ── activate_subscription ────────────────────────────────────────────────────
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

-- ── deactivate_subscription ──────────────────────────────────────────────────
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

-- ── set_updated_at trigger ───────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();
