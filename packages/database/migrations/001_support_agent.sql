-- Support Agent tables — run after 000_shared_bot_core.sql

-- ── Support tickets ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_tickets (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          text        NOT NULL,
  user_id             uuid        REFERENCES users(id) ON DELETE SET NULL,
  triage_category     text,       -- 'billing'|'technical'|'refund_simple'|'refund_complex'|'bug_report'|'feature_request'|'abuse'|'other'
  triage_confidence   numeric,    -- 0..1
  user_message        text        NOT NULL,
  ai_response         text,
  tools_used          jsonb,      -- массив имён tools: ['extendTrial', 'lookupFaq']
  resolution          text,       -- 'auto_resolved' | 'escalated' | 'abandoned' | 'user_left'
  escalation_reason   text,
  langfuse_trace_id   text,       -- для связки с AI observability
  conversation_log    jsonb,      -- полный лог диалога
  created_at          timestamptz DEFAULT now(),
  resolved_at         timestamptz
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_project_status
  ON support_tickets(project_id, resolution, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user
  ON support_tickets(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category
  ON support_tickets(triage_category, created_at DESC);

-- ── Feature signal aggregation ────────────────────────────────────────────────
-- Накапливает типовые запросы пользователей.
-- При ≥20 по одному topic → digest в admin-bot.
CREATE TABLE IF NOT EXISTS feature_signals (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    text        NOT NULL,
  topic         text        NOT NULL,
  count         int         DEFAULT 1,
  first_seen_at timestamptz DEFAULT now(),
  last_seen_at  timestamptz DEFAULT now(),
  UNIQUE (project_id, topic)
);

CREATE INDEX IF NOT EXISTS idx_feature_signals_project
  ON feature_signals(project_id, count DESC);

-- ── Post-order feedback (rating only) ────────────────────────────────────────
-- Используется проектами с post-purchase flow (food, services).
-- Незадействованные проекты просто не пишут сюда.
CREATE TABLE IF NOT EXISTS order_feedback (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  text        NOT NULL,
  user_id     uuid        REFERENCES users(id) ON DELETE SET NULL,
  entity_ref  text,                  -- restaurant/product/service — project-specific
  rating      int         CHECK (rating BETWEEN 1 AND 5),
  sent_at     timestamptz,
  replied_at  timestamptz,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_feedback_project
  ON order_feedback(project_id, created_at DESC);
