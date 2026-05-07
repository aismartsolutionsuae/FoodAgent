-- FoodAgent: Support Agent + Dashboard tables
-- Run this AFTER 001_initial_schema.sql

-- ─── Support tickets ──────────────────────────────────────────────────────────
create table support_tickets (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references users(id) on delete cascade,
  summary      text not null,
  context      jsonb not null default '[]',  -- last N messages for context
  status       text not null default 'open'
                 check (status in ('open','resolved','escalated')),
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);

-- ─── Feature signal aggregation ───────────────────────────────────────────────
-- Tracks recurring user requests to surface V2 priorities
create table feature_signals (
  id            uuid primary key default uuid_generate_v4(),
  topic         text not null unique,
  count         int not null default 1,
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

-- ─── Post-order feedback (30-60 min after search) ─────────────────────────────
create table order_feedback (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references users(id) on delete cascade,
  restaurant  text not null,
  rating      int check (rating between 1 and 5),
  comment     text,
  sent_at     timestamptz not null default now(),
  replied_at  timestamptz
);

-- ─── Nutrition log (per search result user acts on) ───────────────────────────
create table nutrition_log (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references users(id) on delete cascade,
  dish_name     text not null,
  restaurant    text not null,
  platform      text not null check (platform in ('talabat','deliveroo')),
  calories      int,
  protein_g     numeric(6,1),
  fat_g         numeric(6,1),
  carbs_g       numeric(6,1),
  health_index  numeric(4,2),   -- 0.00–10.00, composite score
  ordered_at    timestamptz not null default now()
);

-- ─── Delivery geo-points (for city explorer map) ──────────────────────────────
create table delivery_points (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references users(id) on delete cascade,
  area        text,
  lat         double precision,
  lng         double precision,
  restaurant  text,
  ordered_at  timestamptz not null default now()
);

-- ─── Row-level security ───────────────────────────────────────────────────────
alter table support_tickets  enable row level security;
alter table feature_signals  enable row level security;
alter table order_feedback   enable row level security;
alter table nutrition_log    enable row level security;
alter table delivery_points  enable row level security;
