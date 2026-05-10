-- Agent infrastructure tables — run after 001_support_agent.sql
-- Содержит таблицы для Design & A/B, QA и Marketing агентов.

-- ── pgvector extension (нужна для Support RAG) ────────────────────────────────
-- Включить вручную в Supabase Dashboard → Database → Extensions → vector
-- или выполнить здесь (требует superuser):
-- CREATE EXTENSION IF NOT EXISTS vector;

-- ── Support: knowledge base для RAG ─────────────────────────────────────────
-- Заполняется per-project через projects/[name]/support_knowledge.sql
CREATE TABLE IF NOT EXISTS support_knowledge (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    text        NOT NULL,
  question      text        NOT NULL,
  answer        text        NOT NULL,
  category      text,       -- 'billing' | 'technical' | 'how-to' | etc (project-specific)
  language      text        DEFAULT 'en',
  -- embedding заполняется после включения pgvector:
  -- embedding   vector(1536),
  usage_count   int         DEFAULT 0,
  helpful_count int         DEFAULT 0,  -- инкремент когда AI ответил и пользователь не эскалировал
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_knowledge_project
  ON support_knowledge(project_id, category);
-- После включения pgvector добавить:
-- CREATE INDEX idx_support_knowledge_embedding
--   ON support_knowledge USING ivfflat (embedding vector_cosine_ops);

-- ── Design & A/B: лог решений по экспериментам ───────────────────────────────
CREATE TABLE IF NOT EXISTS experiment_decisions (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id              text        NOT NULL,
  experiment_name         text        NOT NULL,  -- из PostHog
  hypothesis              text,
  start_date              timestamptz NOT NULL,
  conclude_date           timestamptz,
  winner_variant          text,
  control_metric          numeric,
  treatment_metric        numeric,
  improvement_pct         numeric,
  p_value                 numeric,
  sample_size_per_variant int,
  decision                text,       -- 'promoted' | 'rejected' | 'inconclusive'
  decision_reason         text,
  ramp_up_strategy        text,       -- 'immediate_100' | 'gradual_50_then_100' | 'cohort_specific'
  created_at              timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_experiment_decisions_project
  ON experiment_decisions(project_id, conclude_date DESC NULLS FIRST);

-- ── Marketing: опубликованный контент ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS published_content (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           text        NOT NULL,
  content_type         text        NOT NULL,  -- 'tweet'|'linkedin_post'|'reddit_reply'|'seo_page'|'ad_creative'|'email_drip'|'telegram_post'
  platform             text,                  -- 'x'|'linkedin'|'reddit'|'site'|'meta_ads'|'telegram'
  content              text        NOT NULL,
  metadata             jsonb,                 -- { url, post_id, ad_id, scheduled_at, etc }
  generated_by_prompt  text,                  -- prompt name из таблицы prompts
  approval_id          uuid        REFERENCES approval_queue(id),
  performance          jsonb,                 -- { impressions, clicks, conversions, updated_at }
  published_at         timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_published_content_project_type
  ON published_content(project_id, content_type, published_at DESC);

-- ── Marketing: фразы-триггеры для мониторинга соцсетей ───────────────────────
-- Заполняется per-project через projects/[name]/monitor_triggers.sql
CREATE TABLE IF NOT EXISTS monitor_triggers (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           text        NOT NULL,
  trigger_phrase       text        NOT NULL,  -- e.g. 'NOC for car Dubai'
  channels             text[],               -- ['reddit:r/dubai', 'telegram:dubai_expats']
  response_prompt_name text        NOT NULL,  -- prompt из таблицы prompts
  enabled              boolean     DEFAULT true,
  match_count          int         DEFAULT 0,
  reply_count          int         DEFAULT 0,
  created_at           timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_monitor_triggers_project
  ON monitor_triggers(project_id, enabled);
