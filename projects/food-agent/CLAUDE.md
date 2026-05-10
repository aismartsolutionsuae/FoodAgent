# FoodAgent — AI Food Agent for UAE

**Статус:** заморожен (Phase 1 завершена, Phase 2+ на паузе).
**Причина паузы:** приоритет — достройка универсального каркаса (bot-core).

## Overview

Единая точка для поиска, сравнения и заказа еды в ОАЭ.
Агрегирует Talabat + Deliveroo (V1). Языки: RU/EN/AR.

## Stack (project-specific)

- Next.js App Router — лендинг + webhook + API routes
- Playwright worker на Railway — скрейпинг (не работает на Vercel)
- Lemon Squeezy — подписка $9.99/мес, 30-day no-card trial
- Supabase price_cache — TTL 15 мин

## Phases

1. ✅ Foundation — Grammy bot, /start, Supabase schema, subscription middleware
2. ⏸ Scraping — Railway Playwright workers, price cache
3. ⏸ AI Engine — GPT-4o semantic parsing, КБЖУ, price comparison
4. ⏸ Payments — Lemon Squeezy, webhook, trial expiry
5. ⏸ Support Agent — через `@portfolio/bot-core/support`
6. ⏸ TWA Dashboard — weekly report, nutrition index, city map
7. ⏸ MVP Polish

## Project-specific tables

```sql
users, addresses, preferences, subscriptions,
price_cache, search_history, nutrition_log, delivery_points
```

## ENV

```
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
OPENAI_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
LEMONSQUEEZY_API_KEY=
LEMONSQUEEZY_STORE_ID=
LEMONSQUEEZY_PRODUCT_ID=
LEMONSQUEEZY_WEBHOOK_SECRET=
SCRAPER_WORKER_URL=
SCRAPER_WORKER_SECRET=
```

## Webhook registration

```
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<VERCEL_URL>/api/telegram&secret_token=<SECRET>
```
