-- QA Agent: personas table
-- Только схема. Данные персон добавляются на уровне проекта:
-- projects/[name]/personas.sql

CREATE TABLE IF NOT EXISTS personas (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text        NOT NULL,
  name        text        NOT NULL,
  language    text        NOT NULL DEFAULT 'en',
  description text,
  traits      jsonb       DEFAULT '{}',
  -- traits shape: { budget, dietary[], tech_level, typical_queries[], use_cases[] }
  project_id  text,                    -- NULL = shared across all projects
  is_active   boolean     DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (slug, project_id)
);

CREATE INDEX IF NOT EXISTS idx_personas_project ON personas(project_id);
CREATE INDEX IF NOT EXISTS idx_personas_active  ON personas(is_active);

-- ── Row Level Security (deny-by-default; service_role bypasses) ───────────────
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
