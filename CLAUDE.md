# Portfolio Monorepo — AI Factory (UAE)

> Детальное ТЗ агентов: `C:\Disk D\Docs\AI factory\!Слои агентов.md`

## Always-read-first protocol

Before doing ANYTHING, read in this order:
1. This file (CLAUDE.md) — architecture and principles
2. `docs/STATUS.md` — list of projects with correspondent status. The project here means coding of business logic but not the architecture or structure of the overall conveyor of projects.
3. `docs/DECISIONS.md` — architecture decisions log

If `docs/STATUS.md` says a product is frozen, do NOT propose work on it, even if user asks for "next steps". Ask which non-frozen item to work on instead.

## Communication conventions

- Default conversation language: **Russian**. Code, file names, technical terms — English.
- If any user action is required (manual setup, account creation, key generation, deployment trigger, copy-paste somewhere) — state it **explicitly** as a separate "ACTION REQUIRED" callout, not buried in prose.

  Each callout numbered if multiple steps. Wait for user confirmation before continuing.
- Before writing code for a new module/phase — show plan first, wait for approval.
- When encountering ambiguity in instructions — ask before guessing.
- If user corrects you on a fact — verify source before capitulating. If file literally says X and user says Y, quote X and ask to re-check, do not agree blindly.

## Periodic context capture

At the end of each significant work session, ask:

> "В этой сессии были приняты архитектурные или стратегические решения, которые стоит зафиксировать в docs/DECISIONS.md?"

A session counts as significant if any of:
- New library, service, or tool adopted or explicitly rejected
- Architectural pattern chosen over an alternative
- Pricing, monetization, or product scope decision
- A product status changed (frozen → active, or active → frozen)
- A trade-off explicitly resolved (e.g., custom vs ready-made, OpenAI vs Anthropic for specific task type)
- User corrected a previous assumption that affects future decisions

If yes — draft entries in the same format as existing DECISIONS.md entries (date, decision, reasoning, alternatives considered), show them to user, wait for approval, then append to file.

Do NOT auto-append without approval. The log is append-only and authoritative — user must validate each entry.

## 5 слоёв автоматизации (portfolio-wide)

| Слой | Зона ответственности | Живёт в монорепо |
|------|----------------------|-----------------|
| **1. Marketing Agent** | Контент, соцсети (Buffer API), SEO, Meta Ads, Google Ads, reply guy, funnel analysis | `platform/automation/` (n8n workflows) |
| **2. Support Agent** | Tier-1 support (8 категорий), RAG по FAQ, refund → ручной approve, escalation | `packages/bot-core/support/` + `projects/[name]/business/support.ts` |
| **3. Design & A/B Testing Agent** | Feature flags (PostHog), pricing experiments, auto-promotion winners | `packages/bot-core/experiments/` |
| **4. Coding Agent** | Фичи, тесты, фиксы — интерактивно (Claude Code) или автономно (claude-code-action) | `.github/workflows/` |
| **5. QA Agent** | Playwright E2E, Claude-as-judge, synthetic journeys, anomaly detection, BetterStack | `packages/bot-core/qa/` + `platform/monitor/` |

## Стратегия моделей

All AI calls go through `ask()` / `judge()` from `@portfolio/bot-core/ai`. Provider and model are determined per-prompt by `prompts.provider` and `prompts.model` columns in Supabase. **Never hardcode model strings or call OpenAI/Anthropic SDK directly from product code.**

### Default model assignments

| Задача | Модель | Провайдер | Почему |
|---|---|---|---|
| Conversational с пользователями (support, recommendations, чат) | **gpt-5.4** | openai | Заметно живее в длинных диалогах, лучше держит tone, понимает подтекст |
| Творческий контент (посты, письма, SEO, scripts) | **gpt-5.4** | openai | Меньше generic SaaS-tone, лучше под персон |
| Query parsing / Search Orchestrator | **gpt-5.4** | openai | Точнее разбирает многоступенчатые требования |
| Escalation summary, complex synthesis | **gpt-5.4** | openai | Reasoning + tone в одном вызове |
| RAG responder (генерация ответа с context) | **gpt-5.4-mini** | openai | Достаточно качества при цене ниже 5.4 |
| Sentiment analysis, классификация, triage, routing | **gpt-4o-mini** | openai | Простая классификация, ризонинг не нужен |
| Structured data extraction (OCR, normalize) | **gpt-4o** | openai | Формат жёсткий, креативность не нужна |
| Ad analytics, structured output по фиксированному schema | **gpt-4o** | openai | Reliable JSON mode |
| AI-as-judge (оценка output) | **gpt-4o-mini** | openai | Оценочные задачи проще генеративных; mini эффективно оценивает старшую модель |
| Embeddings для RAG | text-embedding-3-small | openai | Стандарт, дёшево |
| Длинные юридические документы (>50K context, lease, contracts) | **claude-opus-4-7** | anthropic | Long-context coherence; подключаем ТОЛЬКО когда дойдёт до legal продукта |

### Rules

1. **Default — OpenAI.** Anthropic подключается ТОЛЬКО когда появляется product с long-context legal workload (lease analysis, contract review). До этого момента — Anthropic API key даже не нужен.
2. **Judge != generator.** Judge должен использовать модель, отличную от generator. Минимум — другую модель того же провайдера (gpt-4o-mini оценивает gpt-4o / gpt-5.4 output). Никогда не используй ту же модель для генерации и оценки.
3. **Изменение модели — UPDATE на `prompts.model` в Supabase**, не код. Деплой не требуется.
4. **Не апгрейдь модели спекулятивно.** Только если в Langfuse видна просадка качества на конкретных промптах.
5. **gpt-5.4 для общения с людьми** — приоритет, даже если 4o дешевле. «Максимально живое общение» — это объективный пользовательский опыт, и разница vs 4o заметна в длинных диалогах.

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
- All AI calls via `ask()` / `judge()` from `@portfolio/bot-core/ai`. Direct calls to OpenAI/Anthropic SDK are forbidden in product code.
- Prompts live in Supabase `prompts` table, not in code. Adding a prompt = SQL INSERT in `projects/[name]/prompts.sql`, not a TypeScript constant.

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
