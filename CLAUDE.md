# Portfolio Monorepo — AI Factory (UAE)

> Детальное ТЗ агентов: `C:\Disk D\Docs\AI factory\!Слои агентов.md`

## 5 слоёв автоматизации (portfolio-wide)

| Слой | Зона ответственности | Живёт в монорепо |
|------|----------------------|-----------------|
| **1. Marketing Agent** | Контент, соцсети (Buffer API), SEO, Meta Ads, Google Ads, reply guy, funnel analysis | `platform/automation/` (n8n workflows) |
| **2. Support Agent** | Tier-1 support (8 категорий), RAG по FAQ, refund → ручной approve, escalation | `packages/bot-core/support/` + `projects/[name]/business/support.ts` |
| **3. Design & A/B Testing Agent** | Feature flags (PostHog), pricing experiments, auto-promotion winners | `packages/bot-core/experiments/` |
| **4. Coding Agent** | Фичи, тесты, фиксы — интерактивно (Claude Code) или автономно (claude-code-action) | `.github/workflows/` |
| **5. QA Agent** | Playwright E2E, Claude-as-judge, synthetic journeys, anomaly detection, BetterStack | `packages/bot-core/qa/` + `platform/monitor/` |

## Стратегия моделей

| Задача | Модель сейчас | После подключения Anthropic API |
|--------|--------------|--------------------------------|
| Творческий контент (посты, письма, сценарии, SEO) | `gpt-5.4` / openai | `claude-sonnet-4-6` / anthropic |
| Summarization, RAG responder, escalation summary | `gpt-5.4` / openai | `claude-sonnet-4-6` / anthropic |
| Длинные документы, юр. анализ | `gpt-4o` / openai | `claude-opus-4-7` / anthropic |
| Аналитика данных, structured output, ads | `gpt-4o` / openai | `gpt-4o` / openai |
| Классификация, triage, sentiment, routing | `gpt-4o-mini` / openai | `gpt-4o-mini` / openai |

## Принципы

- **Готовые решения приоритетны.** Если есть отлаженный сервис или библиотека — используем её. Не пишем кастомный код там, где есть: PostHog (experiments), Langfuse (AI observability), BetterStack (monitoring), Buffer (social posting), n8n (orchestration), pgvector в Supabase (vector search).
- **Модульность.** Каждый слой — отдельный модуль с чистым публичным API. Слои не знают о деталях реализации друг друга.
- **Каркас vs проект.** `packages/` = структура для всех проектов. `projects/[name]/` = специфика конкретного проекта (персоны, промпты, эксперименты, support knowledge).
- **Промпты в БД.** Все AI-промпты в Supabase `prompts`. Модель меняется в таблице без редеплоя.
- **i18n с дня 1.** RU/EN/AR через `@portfolio/bot-core/i18n` для всех B2C продуктов.
- **Refund — только ручной approve.** Auto-refund отключён. Все запросы → `approval_queue`.
- TypeScript strict mode. Без комментариев если WHY не неочевидно.

## Обязательные стандарты каждого проекта

- `GET /health` endpoint зарегистрирован в BetterStack
- Conversations для онбординга (`@grammyjs/conversations`)
- Персоны в `projects/[name]/personas.sql`
- Промпты в `projects/[name]/prompts.sql`

## Структура монорепо

```
packages/
  bot-core/src/
    ai/          — AI router (ask, judge, stream, costs, Langfuse)
    support/     — Support Agent (triage, RAG, tools, escalation)
    marketing/   — Marketing Agent (content gen, approval queue, publish)
    experiments/ — A/B Testing (PostHog flags, analyzer)
    qa/          — QA Agent (journey simulator, personas loader)
    admin-bot/   — notifyAdminBot() — единая точка уведомлений
    email/       — Resend wrapper
    payments/    — Lemon Squeezy + Stripe
    i18n/        — Fluent i18n
    session/     — Grammy session
    transport/   — Grammy bot factory
  database/
    migrations/  — SQL схемы (000–004), без project-specific seed data

platform/
  admin-bot/    — Telegram бот для управления портфелем
  dashboard/    — Web dashboard (Next.js)
  monitor/      — services.ts, anomaly detection, alert router
  automation/   — n8n workflows (когда будет развёрнут)

projects/
  _template/    — шаблон нового проекта
  [name]/       — каждый продукт: src/, worker/, migrations/, personas.sql, prompts.sql
```
