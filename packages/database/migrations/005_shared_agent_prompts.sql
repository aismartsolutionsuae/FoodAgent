-- Shared (project_id = NULL) prompts for support + qa subagents.
-- Mirrors 002_marketing_prompts.sql conventions. Projects override per-project
-- in projects/[name]/prompts.sql. Models per CLAUDE.md model strategy:
--   support:sentiment  -> gpt-4o-mini (classification)
--   qa:reply_judge     -> gpt-4o-mini (AI-as-judge, is_judge=true)

INSERT INTO prompts (name, content, model, provider, project_id, is_judge, rubric_schema) VALUES

('support:sentiment', $$
Classify the sentiment of the following user message.
Reply with ONLY a JSON object in this exact format:
{"sentiment":"positive"|"neutral"|"negative","score":0.0-1.0,"reason":"one short sentence"}

User message: {{message}}
$$, 'gpt-4o-mini', 'openai', NULL, false, NULL),

('qa:reply_judge', $$
You are a QA evaluator for a Telegram bot.
User message: "{{userMessage}}"
Bot reply: "{{botReply}}"
Evaluation criteria: {{criteria}}

Rate the reply on a scale of 0–10 and explain briefly.
Reply in JSON: { "score": number, "passed": boolean, "reasoning": string, "suggestions": string[] }
$$, 'gpt-4o-mini', 'openai', NULL, true,
 '{"score":"number","passed":"boolean","reasoning":"string","suggestions":"string[]"}'::jsonb)

ON CONFLICT (name, project_id) DO UPDATE
  SET content    = EXCLUDED.content,
      model      = EXCLUDED.model,
      provider   = EXCLUDED.provider,
      is_judge   = EXCLUDED.is_judge,
      rubric_schema = EXCLUDED.rubric_schema,
      updated_at = now();
