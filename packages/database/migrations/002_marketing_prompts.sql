-- Marketing Agent: starter prompt templates (project_id = NULL = shared defaults)
-- Эти промпты — минимальные рабочие заглушки.
-- Каждый проект переопределяет их в projects/[name]/prompts.sql
-- с project_id = 'project-name', своим тоном, brand voice и моделью.
--
-- Модель по умолчанию для творческого контента: gpt-5.4
-- Менять прямо в таблице — без редеплоя.

INSERT INTO prompts (name, content, model, provider, project_id) VALUES

('marketing:telegram_post', $$
Напиши пост для Telegram-канала.
Тема: {{topic}}
Язык: {{language}}
Длина: 3–5 предложений + призыв к действию.
Формат: HTML.
$$, 'gpt-5.4', 'openai', NULL),

('marketing:instagram_post', $$
Напиши пост для Instagram.
Тема: {{topic}}
Язык: {{language}}
Длина: 2–4 предложения + хештеги в конце.
Формат: plain text.
$$, 'gpt-5.4', 'openai', NULL),

('marketing:linkedin_post', $$
Напиши пост для LinkedIn.
Тема: {{topic}}
Язык: {{language}}
Длина: до 1300 символов. Формат: plain text.
$$, 'gpt-5.4', 'openai', NULL),

('marketing:twitter_post', $$
Напиши твит или тред для Twitter/X.
Тема: {{topic}}
Язык: {{language}}
Формат: {{format}}  — 'single' (до 280 символов) или 'thread' (3–5 твитов).
$$, 'gpt-5.4', 'openai', NULL),

('marketing:tiktok_script', $$
Напиши сценарий короткого видео (TikTok / Reels).
Тема: {{topic}}
Язык: {{language}}
Продукт: {{product_name}}
Длительность: 30–60 секунд.
$$, 'gpt-5.4', 'openai', NULL),

('marketing:seo_page_generator', $$
Напиши текст SEO-страницы.
Ключ: {{target_keyword}}
Язык: {{language}}
Продукт: {{product_name}}
Объём: 400–600 слов.
$$, 'gpt-5.4', 'openai', NULL),

('marketing:reply_to_post', $$
Напиши ответ на публикацию от лица бренда.
Оригинальный текст: {{original_text}}
Язык: {{language}}
Длина: 1–3 предложения.
$$, 'gpt-5.4', 'openai', NULL),

('marketing:email_welcome', $$
Напиши приветственное письмо новому пользователю.
Сервис: {{service_name}}
Язык: {{language}}
Что получает пользователь: {{value_prop}}
Формат: HTML.
$$, 'gpt-5.4', 'openai', NULL),

('marketing:email_reengagement', $$
Пользователь не заходил {{days_inactive}} дней. Напиши письмо-возврат.
Сервис: {{service_name}}
Язык: {{language}}
Последнее действие: {{last_action}}
Формат: HTML.
$$, 'gpt-5.4', 'openai', NULL),

('marketing:meta_ads_creative', $$
Напиши текст рекламного объявления для Meta Ads.
Продукт: {{product_name}}
Аудитория: {{audience}}
Язык: {{language}}
Формат: primary text + headline + description.
$$, 'gpt-5.4', 'openai', NULL),

('marketing:google_ads_copy', $$
Напиши текст для Google Search Ads.
Продукт: {{product_name}}
Ключ: {{target_keyword}}
Язык: {{language}}
Формат: 3 headline (до 30 симв.) + 2 description (до 90 симв.).
$$, 'gpt-5.4', 'openai', NULL)

ON CONFLICT (name, project_id) DO UPDATE
  SET content    = EXCLUDED.content,
      model      = EXCLUDED.model,
      provider   = EXCLUDED.provider,
      updated_at = now();
