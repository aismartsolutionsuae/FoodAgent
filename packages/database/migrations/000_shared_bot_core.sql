-- Shared infrastructure tables required by @portfolio/bot-core.
-- Run ONCE against the shared Supabase project before deploying any bot.
--
-- RLS posture: every table below has RLS ENABLED with NO policies.
-- anon/authenticated keys are denied by default; service_role (used by all
-- bots and by migrations) bypasses RLS, so server-side access is unaffected.
-- This is defense-in-depth for future client-side (dashboard / Telegram Web
-- App) access — see DECISIONS.md 2026-05-15.

-- ── Users (channel-agnostic person record, per-product scoped) ────────────────
-- One row per (person, project_id). Per-product isolation: the same human
-- using two products = two users rows. Cross-product analytics is possible
-- via a JOIN on a shared channel identity when explicitly needed.
CREATE TABLE IF NOT EXISTS users (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  text        NOT NULL,
  language    text        NOT NULL DEFAULT 'ru' CHECK (language IN ('ru','en','ar')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_project ON users(project_id);

-- ── User identities (omnichannel) ─────────────────────────────────────────────
-- A person reaches a product via one or more channels. channel_user_id holds:
--   telegram → telegram_id as text
--   web      → email / oauth-sub / anonymous uuid (web auth method TBD)
--   whatsapp → wa_id (phone, E.164) — channel provisioned, integration later
-- project_id is denormalized from users (immutable per user) so "one channel
-- identity → one user within a product" is a simple UNIQUE constraint.
-- MVP: each channel identity creates its own users row (no auto cross-channel
-- linking). Schema supports linking later WITHOUT a migration.
CREATE TABLE IF NOT EXISTS user_identities (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id      text        NOT NULL,
  channel         text        NOT NULL CHECK (channel IN ('telegram','web','whatsapp')),
  channel_user_id text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel, channel_user_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_user_identities_user ON user_identities(user_id);

-- ── Session storage ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bot_sessions (
  key        text        PRIMARY KEY,
  value      jsonb       NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

-- ── Portfolio-wide event log ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portfolio_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  text,
  user_id     uuid        REFERENCES users(id) ON DELETE SET NULL,
  event_name  text        NOT NULL,
  properties  jsonb       DEFAULT '{}',
  revenue_usd numeric(10,2),
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_events_project
  ON portfolio_events(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portfolio_events_user
  ON portfolio_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portfolio_events_name
  ON portfolio_events(event_name, created_at DESC);

-- ── AI prompts store ──────────────────────────────────────────────────────────
-- project_id = NULL  → shared across all projects
-- project_id = 'foo' → overrides shared prompt for that project
CREATE TABLE IF NOT EXISTS prompts (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text        NOT NULL,
  content        text        NOT NULL,
  model          text        DEFAULT 'gpt-4o',
  provider       text        DEFAULT 'openai',   -- 'openai' | 'anthropic'
  is_judge       boolean     DEFAULT false,
  rubric_schema  jsonb,
  version        int         DEFAULT 1,
  project_id     text,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),
  UNIQUE (name, project_id)
);

CREATE INDEX IF NOT EXISTS idx_prompts_name    ON prompts(name);
CREATE INDEX IF NOT EXISTS idx_prompts_project ON prompts(project_id);

-- ── Approval queue (shared across all agents) ─────────────────────────────────
-- Каждый агент кладёт сюда задачи, требующие approve от основателя.
-- admin-bot читает pending-записи и показывает через /pending.
CREATE TABLE IF NOT EXISTS approval_queue (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      text        NOT NULL,
  agent_type      text        NOT NULL,   -- 'marketing' | 'support' | 'experiments' | 'qa'
  action_type     text        NOT NULL,   -- 'post_content' | 'process_refund' | 'promote_variant' | 'merge_pr' | etc
  payload         jsonb       NOT NULL,   -- данные для выполнения после approve
  context         jsonb,                  -- дополнительный контекст для review (превью, метрики)
  status          text        DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected' | 'expired' | 'auto_resolved'
  expires_at      timestamptz,
  created_at      timestamptz DEFAULT now(),
  resolved_at     timestamptz,
  resolved_by     text,                   -- 'founder' | 'auto' | 'system'
  resolution_data jsonb                   -- результат после approve (post_url, refund_id, etc)
);

-- Partial index — только pending записи (большинство запросов по ним)
CREATE INDEX IF NOT EXISTS idx_approval_queue_pending
  ON approval_queue(status, agent_type, created_at DESC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_approval_queue_project
  ON approval_queue(project_id, created_at DESC);

-- ── Row Level Security (deny-by-default; service_role bypasses) ───────────────
ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_identities  ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_queue   ENABLE ROW LEVEL SECURITY;
