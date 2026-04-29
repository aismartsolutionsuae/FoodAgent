-- FoodAgent: initial schema
-- Run this in Supabase Dashboard → SQL Editor

create extension if not exists "uuid-ossp";

-- ─── Users ────────────────────────────────────────────────────────────────────
create table users (
  id               uuid primary key default uuid_generate_v4(),
  telegram_id      bigint unique not null,
  name             text,
  language         text not null default 'ru' check (language in ('ru', 'en', 'ar')),
  onboarding_step  text not null default 'language'
                     check (onboarding_step in ('language','name','cuisine','stop_list','address','complete')),
  created_at       timestamptz not null default now()
);

-- ─── Addresses ────────────────────────────────────────────────────────────────
create table addresses (
  id        uuid primary key default uuid_generate_v4(),
  user_id   uuid not null references users(id) on delete cascade,
  label     text not null default 'home',   -- 'home' | 'work' | custom
  address   text not null,
  lat       double precision,
  lng       double precision
);

-- ─── Taste preferences ────────────────────────────────────────────────────────
create table preferences (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null unique references users(id) on delete cascade,
  cuisines         text[] not null default '{}',
  stop_list        text[] not null default '{}',
  dietary_markers  text[] not null default '{}'
);

-- ─── Subscriptions (30-day app-level trial) ───────────────────────────────────
create table subscriptions (
  id                   uuid primary key default uuid_generate_v4(),
  user_id              uuid not null unique references users(id) on delete cascade,
  trial_started_at     timestamptz not null default now(),
  trial_expires_at     timestamptz not null default (now() + interval '30 days'),
  status               text not null default 'trial'
                         check (status in ('trial','active','expired','cancelled')),
  ls_subscription_id   text,
  ls_customer_id       text,
  current_period_end   timestamptz
);

-- ─── Price cache (scraped results, TTL 15 min) ────────────────────────────────
create table price_cache (
  id           uuid primary key default uuid_generate_v4(),
  query_hash   text not null,
  platform     text not null check (platform in ('talabat','deliveroo')),
  results      jsonb not null default '[]',
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default (now() + interval '15 minutes'),
  unique (query_hash, platform)
);

-- ─── Search history ───────────────────────────────────────────────────────────
create table search_history (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references users(id) on delete cascade,
  query             text not null,
  results_snapshot  jsonb,
  created_at        timestamptz not null default now()
);

-- ─── Row-level security (service role bypasses all) ──────────────────────────
alter table users           enable row level security;
alter table addresses       enable row level security;
alter table preferences     enable row level security;
alter table subscriptions   enable row level security;
alter table price_cache     enable row level security;
alter table search_history  enable row level security;
