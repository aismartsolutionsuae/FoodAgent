# Контекст: Portfolio Monorepo

Ты работаешь в существующем монорепозитории портфеля Telegram-ботов и веб-сервисов.
Инфраструктура уже построена. Твоя задача — настроить ТОЛЬКО бизнес-логику нового проекта.
Не переписывай и не дублируй то, что уже есть в `packages/`.

## Структура репозитория

```
portfolio/
├── packages/
│   ├── bot-core/          # Переиспользуемое ядро — НЕ ТРОГАТЬ
│   └── database/          # Shared-типы Supabase — НЕ ТРОГАТЬ
├── platform/
│   ├── admin-bot/         # Личный Telegram-бот управления портфелем
│   ├── monitor/           # Аптайм + авто-рестарт через Railway API
│   └── automation/        # n8n (self-hosted, маркетинг)
└── projects/
    ├── _template/         # Шаблон — копировать, не редактировать оригинал
    └── [project-name]/    # ← сюда идёт вся работа
```

## Доступные пакеты и их API

### Transport — `@portfolio/bot-core/transport`

```typescript
import { createBot } from '@portfolio/bot-core/transport/telegram'
// createBot() возвращает настроенный Grammy Bot с уже подключёнными:
// - userMiddleware (загрузка ctx.dbUser из Supabase)
// - subscriptionMiddleware (проверка триала/подписки)
// - ratelimiter (защита от флуда)
// - session storage (Supabase-адаптер)
// - i18n (подключается отдельно, см. ниже)
```

### Session — `@portfolio/bot-core/session`

```typescript
import { type SessionData } from '@portfolio/bot-core/session'
// SessionData — базовый тип. Расширяй в проекте:
interface MySessionData extends SessionData {
  step?: 'choose_category' | 'enter_details' | 'confirm'
  draftOrder?: { item: string; quantity: number }
}
// Conversations (@grammyjs/conversations) уже подключён.
// Используй conversation.wait() вместо кастомных onboarding_step в БД.
```

### i18n — `@portfolio/bot-core/i18n`

```typescript
import { setupI18n } from '@portfolio/bot-core/i18n'
// Файлы переводов: projects/[name]/locales/{ru,en,ar}.ftl
// Fluent-формат. Базовые строки (unknown_command, errors, subscription)
// уже есть в packages/bot-core/locales/ — не дублируй.
// В проекте добавляй только уникальные строки.
```

### AI — `@portfolio/bot-core/ai`

```typescript
import { ask, stream, getPrompt } from '@portfolio/bot-core/ai'

// ask(promptName, variables, opts?) — берёт промпт из Supabase по имени,
// подставляет переменные, вызывает OpenAI, возвращает строку.
// opts: { model?, temperature?, userId? (для логирования) }

// stream(promptName, variables, onChunk) — стриминг ответа.

// getPrompt(name) — только получить текст промпта (с кэшем 10 мин).

// Промпты хранятся в таблице prompts { name, content, model, project_id }
// project_id = null → shared, project_id = ID → только для проекта.
```

### Payments — `@portfolio/bot-core/payments`

```typescript
import {
  getCheckoutUrl,        // Lemon Squeezy: генерирует ссылку оплаты
  getStripeCheckoutUrl,  // Stripe: генерирует ссылку оплаты
  handleLSWebhook,       // обработчик LS-вебхука (уже валидирует подпись)
  handleStripeWebhook,   // обработчик Stripe-вебхука
  extendTrial,           // userId, days → продлить триал в Supabase
} from '@portfolio/bot-core/payments'

// Subscription middleware уже встроен в createBot().
// Если нужна кастомная логика после оплаты — слушай событие 'subscription:activated'
```

### Analytics — `@portfolio/bot-core/analytics`

```typescript
import { track } from '@portfolio/bot-core/analytics'
// track(event, properties, userId?) → PostHog + portfolio_events в Supabase
// Обязательные события (трекаются автоматически):
//   bot:start, subscription:trial_start, subscription:activated,
//   subscription:expired, search:completed, error:unhandled
// В проекте добавляй только бизнес-события:
//   track('order:created', { item, price }, userId)
```

### Email — `@portfolio/bot-core/email`

```typescript
import { sendEmail } from '@portfolio/bot-core/email'
// sendEmail({ to, subject, template, variables })
// Шаблоны: packages/bot-core/email-templates/ (базовые)
//          projects/[name]/email-templates/ (проектные)
```

### Monitor — автоматически

```
Каждый проект должен иметь GET /health эндпоинт.
platform/monitor автоматически добавит его в BetterStack при регистрации.
Регистрация: добавь запись в platform/monitor/services.ts
```

## Схема базы данных

### Shared-таблицы (уже существуют, НЕ СОЗДАВАТЬ):
```sql
users            -- telegram_id, name, language, onboarding_step
subscriptions    -- user_id, status, trial_expires_at, ls_subscription_id
addresses        -- user_id, label, address, lat, lng
prompts          -- name, content, model, project_id
portfolio_events -- project_id, user_id, event_name, properties, revenue_usd
```

### Для каждого проекта создавай только бизнес-таблицы:
```
projects/[name]/migrations/
  001_initial.sql   -- только таблицы специфичные для проекта
```

## Переменные окружения

### Уже настроены глобально (НЕ ДОБАВЛЯТЬ В ПРОЕКТ):
```
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
TELEGRAM_WEBHOOK_SECRET
LEMONSQUEEZY_API_KEY, LEMONSQUEEZY_STORE_ID
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
RESEND_API_KEY
POSTHOG_API_KEY
RAILWAY_API_KEY
BETTERSTACK_API_KEY
```

### Проект добавляет только своё:
```
[PROJECT_NAME]_BOT_TOKEN=        # токен Telegram-бота
[PROJECT_NAME]_LS_PRODUCT_ID=    # ID продукта в Lemon Squeezy (если платный)
[PROJECT_NAME]_STRIPE_PRICE_ID=  # ID цены в Stripe (если платный)
# + любые API-ключи специфичные для бизнес-логики проекта
```

## Структура нового проекта

```
projects/[name]/
├── bot.ts                  # точка входа: import { createBot } + регистрация хендлеров
├── webhook/
│   └── route.ts            # Next.js/Express route для Telegram webhook
├── business/               # ВСЯ уникальная логика здесь
│   ├── [domain].ts         # основная бизнес-логика
│   └── ...
├── conversations/           # @grammyjs/conversations сценарии
│   └── [flow].ts
├── locales/
│   ├── ru.ftl
│   ├── en.ftl
│   └── ar.ftl              # только если нужен арабский
├── email-templates/         # только проектные шаблоны
├── migrations/
│   └── 001_initial.sql
├── prompts.sql              # INSERT в таблицу prompts для этого проекта
└── .env.example             # только проектные переменные
```

## Чеклист запуска нового проекта

Claude должен выполнить эти шаги в указанном порядке:

- [ ] 1. Скопировать `projects/_template` → `projects/[name]`
- [ ] 2. Создать `migrations/001_initial.sql` (только бизнес-таблицы)
- [ ] 3. Написать `prompts.sql` (промпты для AI-функций проекта)
- [ ] 4. Создать файлы локализации (начать с ru.ftl, en.ftl)
- [ ] 5. Реализовать `business/` модули
- [ ] 6. Написать conversations/ сценарии (онбординг, основной флоу)
- [ ] 7. Зарегистрировать хендлеры в `bot.ts`
- [ ] 8. Добавить сервис в `platform/monitor/services.ts`
- [ ] 9. Добавить `.env.example` с проектными переменными
- [ ] 10. Проверить: `npx tsc --noEmit` чистый

## Правила для Claude

**ЗАПРЕЩЕНО:**
- Создавать собственный i18n (использовать только `@portfolio/bot-core/i18n`)
- Реализовывать subscription/trial логику (уже в middleware)
- Писать прямые запросы к OpenAI (только через `ask()` / `stream()`)
- Создавать shared-таблицы — они общие и уже существуют
- Добавлять глобальные env-переменные в проектный `.env`
- Писать кастомный rate limiter, session storage, webhook verification

**ОБЯЗАТЕЛЬНО:**
- Весь стейт онбординга — через `@grammyjs/conversations`, не через поля в БД
- Все события — через `track()` из analytics
- Все AI-запросы — через `ask()`, промпты хранить в `prompts.sql`
- TypeScript strict mode, `npx tsc --noEmit` без ошибок перед завершением

---

## НОВЫЙ ПРОЕКТ

**Название:** [PROJECT_NAME]

**Описание:** [Одна фраза: что делает бот и для кого]

**Целевая аудитория:** [Кто пользователи]

**Платформы:** [ ] Telegram  [ ] Web  [ ] WhatsApp (будущее)

**Монетизация:**
- [ ] Бесплатно
- [ ] Триал X дней → подписка $X/мес (Lemon Squeezy)
- [ ] Разовая оплата (Stripe)
- [ ] Freemium (описать лимиты)

**Языки:** [ ] RU  [ ] EN  [ ] AR

**Тип пользователей:** [ ] Одиночный  [ ] Многопользовательский

**Уникальная бизнес-логика:**
[Опиши только то, что отличает этот проект от других.
Что происходит ПОСЛЕ того как пользователь прошёл онбординг?
Какие данные собираем? Какой основной пользовательский флоу?]

**Внешние API/сервисы специфичные для проекта:**
[Список API которых нет в глобальной инфраструктуре]

**Схема данных (только бизнес-таблицы):**
[Какие таблицы нужны помимо users/subscriptions/addresses]

**Задача для Claude:**
Реализуй проект согласно описанию выше, используя существующую инфраструктуру.
Начни с чеклиста. Не реализуй то, что уже есть в `packages/`.
