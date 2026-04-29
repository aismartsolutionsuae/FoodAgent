# FoodAgent — AI Food Agent for UAE

## Project Overview

Single entry point for searching, comparing, and ordering food in the UAE.
Aggregates data from Talabat and Deliveroo (V1), with Careem/Noon in V2.
Provides recommendations based on taste preferences, nutritional value, and price efficiency.
Languages: **Russian, English, Arabic**. User selects on first `/start` via inline buttons.
Language stored in `users.language`. All bot copy lives in `src/lib/i18n.ts`.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | **Next.js** (App Router) | Landing page + API routes + Telegram webhook in one project |
| Telegram Bot | **Grammy.js** (TypeScript) | Webhook-based bot, typed, supports middleware |
| AI (primary) | **OpenAI GPT-4o** | Already paid, handles RU/EN/AR well, sufficient for MVP tasks |
| AI (simple) | **GPT-4o-mini** | Language detection, simple routing — 10x cheaper than GPT-4o |
| Scraping | **Playwright** on Railway | Can't run on Vercel (serverless limit); Railway free tier works |
| Database | **Supabase** | User profiles, price cache, search history, subscription status |
| Payments | **Lemon Squeezy** | Merchant of record, no card data touched by us |
| Trial control | **App-level** (Supabase) | 30-day free trial WITHOUT card; Lemon Squeezy only after expiry |
| Price cache | Supabase `price_cache` table | TTL via `expires_at` column (15 min), no Redis needed for MVP |
| Hosting | **Vercel** (Next.js) + **Railway** (Playwright worker) | Vercel for web; Railway for browser scraping |

### Why two servers?
Playwright needs a real Chrome browser (~300MB). Vercel serverless functions
have a 10-second limit and no browser support. Railway runs a persistent Node.js
process that Vercel calls via HTTP when a scrape is needed.

---

## Architecture

```
User (Telegram)
 │
 ▼
Grammy Webhook → /api/telegram (Vercel / Next.js)
 │
 ├─► Subscription Middleware    checks trial / active status in Supabase
 │    └── if expired → send Lemon Squeezy payment link, block further action
 │
 ├─► Profile Service            Supabase: users, addresses, preferences
 │
 ├─► Search Orchestrator        OpenAI GPT-4o: parse natural-language query
 │                              → structured search params { cuisine, dish, filters }
 │
 ├─► Scraping Coordinator       calls Railway Playwright worker via HTTP
 │    └── Railway Worker        Talabat scraper + Deliveroo scraper → Supabase price_cache
 │
 ├─► Price Comparator           ranks by total cost (dish + delivery + service fee)
 │
 └─► КБЖУ Calculator            OpenAI: estimate calories / protein / fat / carbs from description
```

---

## Supabase Schema (planned)

```sql
-- Core user
users
  id uuid PK
  telegram_id bigint UNIQUE
  name text
  language text DEFAULT 'ru'
  created_at timestamptz

-- Saved addresses (home / work)
addresses
  id uuid PK
  user_id uuid FK → users
  label text           -- 'home' | 'work' | custom
  address text
  lat float
  lng float

-- Taste profile
preferences
  id uuid PK
  user_id uuid FK → users
  cuisines text[]        -- ['Italian', 'Japanese']
  stop_list text[]       -- ['cilantro', 'liver']
  dietary_markers text[] -- ['halal', 'vegan']

-- 30-day app-level trial + subscription state
subscriptions
  id uuid PK
  user_id uuid FK → users
  trial_started_at timestamptz   -- set on first /start
  trial_expires_at timestamptz   -- trial_started_at + 30 days
  status text    -- 'trial' | 'active' | 'expired' | 'cancelled'
  ls_subscription_id text        -- Lemon Squeezy ID (null until paid)
  ls_customer_id text
  current_period_end timestamptz -- when current paid period ends

-- Scraped price results (cached 15 min)
price_cache
  id uuid PK
  query_hash text UNIQUE    -- hash of search params
  platform text             -- 'talabat' | 'deliveroo'
  results jsonb             -- array of dishes with prices
  created_at timestamptz
  expires_at timestamptz    -- created_at + 15 minutes

-- User search history
search_history
  id uuid PK
  user_id uuid FK → users
  query text
  results_snapshot jsonb
  created_at timestamptz
```

---

## Subscription & Trial Logic

### Flow
1. User sends `/start` → create `users` row + `subscriptions` row with status=`'trial'`
2. **Every bot request** runs through `SubscriptionMiddleware`:
   - `status = 'trial'` AND `now() < trial_expires_at` → allow
   - `status = 'trial'` AND `now() >= trial_expires_at` → update status to `'expired'`, send payment prompt
   - `status = 'active'` AND `now() < current_period_end` → allow
   - anything else → send payment prompt, block
3. Payment prompt sends a **Lemon Squeezy checkout URL** with `telegram_id` in metadata
4. User pays → Lemon Squeezy fires POST to `/api/webhooks/lemon-squeezy`
5. Webhook validates signature → updates Supabase: `status = 'active'`, stores `ls_subscription_id`

### Trial Rules
- Trial starts on first `/start` message
- No card or payment info requested during trial
- Lemon Squeezy product is a **monthly subscription** (no trial on LS side)
- We create the LS subscription only when user actively pays after trial

---

## Lemon Squeezy Setup (one-time)
1. Create account at lemonsqueezy.com
2. Create a Product → Subscription → monthly price (e.g. 9.99 USD)
3. Note: `LEMONSQUEEZY_STORE_ID`, `LEMONSQUEEZY_PRODUCT_ID`, `LEMONSQUEEZY_API_KEY`
4. Add Webhook in LS dashboard → URL: `https://your-vercel-app.vercel.app/api/webhooks/lemon-squeezy`
5. Events to subscribe: `subscription_created`, `subscription_updated`, `subscription_cancelled`

---

## MVP Scope (V1)

### In scope
- Telegram Bot (RU / EN / AR) with language picker on first `/start`
- User profile: taste preferences, stop-list, saved addresses
- 30-day app-level free trial (no card upfront)
- Lemon Squeezy payment after trial expiry
- Semantic search via OpenAI GPT-4o
- Scraping: Talabat + Deliveroo (guest, no auth)
- Price comparison (dish + delivery + service fees)
- КБЖУ estimation per dish
- Top-3 results with deep links to aggregator apps
- Basic landing page

### Out of scope (V2+)
- Careem, Noon
- Vision-based food photo analysis (food photo → nutritional analysis)

---

## Implementation Phases

1. **Foundation** ✅ — Grammy bot, `/start` onboarding, Supabase schema, subscription middleware
2. **Scraping** — Railway Playwright workers for Talabat + Deliveroo, price cache
3. **AI Engine** — GPT-4o semantic parsing, КБЖУ calc, price comparison ranking
4. **Payments** — Lemon Squeezy integration, webhook handler, trial expiry flow
5. **Support Agent** — sentiment analysis, proactive feedback, bug escalation, tools
6. **TWA Dashboard** — weekly report (savings, nutrition index, city map)
7. **MVP Polish** — deep links, search history, landing page, weekly cron

---

## Environment Variables

```
# OpenAI
OPENAI_API_KEY=

# Telegram
TELEGRAM_BOT_TOKEN=            # test token for now, swap for production later
TELEGRAM_WEBHOOK_SECRET=       # random string, used to verify webhook calls

# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Lemon Squeezy
LEMONSQUEEZY_API_KEY=
LEMONSQUEEZY_STORE_ID=
LEMONSQUEEZY_PRODUCT_ID=       # the subscription product ID
LEMONSQUEEZY_WEBHOOK_SECRET=   # from LS dashboard, used to verify webhook signatures

# Railway Playwright Worker
SCRAPER_WORKER_URL=            # e.g. https://foodagent-scraper.up.railway.app
SCRAPER_WORKER_SECRET=         # shared secret between Vercel and Railway
```

---

## Conventions

- **TypeScript** strict mode throughout
- No comments unless the WHY is non-obvious
- No premature abstractions — simplest thing that works
- No error handling for impossible cases — trust framework guarantees
- Scraping: guest browsing only (no stored credentials)
- **Read `node_modules/next/dist/docs/`** before touching Next.js-specific APIs
- **Wait for user approval** before writing code for each new phase
- Changing `TELEGRAM_BOT_TOKEN` later only requires updating the env var + re-registering the webhook URL — no code changes needed

---

## KPIs (V1 targets)

- КБЖУ accuracy: ≤15% deviation from actual
- Price comparison speed: ≤15 seconds across 2 platforms
- Trial-to-paid conversion tracked via Supabase

---

## Model Usage Strategy

| Task | Model | Why |
|---|---|---|
| Semantic query parsing | GPT-4o | Complex multilingual NLU |
| КБЖУ estimation | GPT-4o | Nutrition knowledge |
| Language detection | GPT-4o-mini | Simple classification, 10x cheaper |
| Simple confirmations | GPT-4o-mini | No heavy reasoning needed |

Upgrade to GPT-4.5 or GPT-5 only if GPT-4o shows measurable accuracy failures in production.

---

## Module: Support Agent (P1 — Phase 5)

A second AI persona living inside the same Telegram bot. Activated when:
- Search returns an error (scraper failed, site down)
- User sends angry/frustrated message (sentiment score > threshold)
- User has been inactive 24h after completing onboarding
- User reports a wrong price or broken link

### Capabilities (tools the Support Agent can call)

| Tool | What it does |
|---|---|
| `extendTrial(userId, days)` | Adds N days to `subscriptions.trial_expires_at` in Supabase |
| `reportBug(context)` | Saves to `support_tickets` table + sends Telegram message to owner |
| `updatePreference(userId, field, value)` | Writes feedback directly into `preferences` |
| `escalateToHuman(userId, history)` | Sends owner a Telegram message with chat transcript + "НУЖЕН ЧЕЛОВЕК" |

### Behavior rules

- **Sentiment analysis:** GPT-4o-mini classifies every user message as positive / neutral / negative.
  Threshold negative → Support Agent intercepts before food search.
- **Proactive check-in:** 30–60 min after a completed search, bot asks "Как еда из [Restaurant]? Оцените от 1 до 5".
  User replies with a digit only (no free text):
  - 1–2 → add restaurant to `preferences.restaurant_stop_list[]`
  - 5   → add restaurant to `preferences.preferred_restaurants[]`
  - 3–4 → no action, no reply
- **Inactive user re-engagement:** 24h after `onboarding_step = 'complete'` with no searches →
  bot sends a friendly nudge with an example query.
- **Scraper fallback:** If Talabat scraper fails, Support Agent acknowledges it, retries with
  Deliveroo only, and explains the situation to the user.
- **Escalation limit:** If ≥ 2 support messages haven't resolved the issue → `escalateToHuman()`.
- **Feature signal aggregation:** Common user questions (topic, frequency) stored in
  `feature_signals` table. When ≥ 20 users ask about the same topic → owner gets a digest.

### New Supabase tables (Phase 5 migration)

```sql
-- Support tickets
support_tickets
  id uuid PK
  user_id uuid FK → users
  summary text
  context jsonb          -- last N messages
  status text            -- 'open' | 'resolved' | 'escalated'
  created_at timestamptz
  resolved_at timestamptz

-- Feature signal aggregation
feature_signals
  id uuid PK
  topic text
  count int default 1
  first_seen_at timestamptz
  last_seen_at timestamptz

-- Post-order feedback (rating only, no free text)
order_feedback
  id uuid PK
  user_id uuid FK → users
  restaurant text
  rating int             -- 1–5 (digit reply from user)
  sent_at timestamptz    -- when check-in was sent
  replied_at timestamptz
```

---

## Search Rules & Smart Recommendations (Phase 3)

Core search behaviour rules, applied by the AI Search Orchestrator on every query.

### Restaurant rating filter
- Default minimum restaurant rating: **4.0**
- If query contains budget/savings signal ("подешевле", "сэкономить", "бюджетно", "cheapest", "save money" etc.) →
  ask user: "Включить заведения с рейтингом ниже 4? Там бывает дешевле."
  Inline buttons: [Да, показать всё] [Нет, только 4+]

### Preferred & blocked restaurants
- `preferences.preferred_restaurants[]` — from 5-star proactive feedback.
  If a preferred restaurant covers the delivery zone and matches the query → show it first with ⭐ marker.
  If not in delivery zone → silently skip, no mention to user.
- `preferences.restaurant_stop_list[]` — from 1–2-star proactive feedback.
  Never surface these in results regardless of other criteria.

### Stop-list conflict detection
If the user's query explicitly requests an ingredient that is in their `preferences.stop_list`:
- Do **not** silently filter — ask instead:
  "Лосось в вашем стоп-листе 🚫 Как поступим?"
  Inline buttons:
  1. Найти всё равно (one-time override)
  2. Убрать из стоп-листа навсегда
  3. Это ошибка — отменить

### Explicit restaurant request
If the user names a specific restaurant ("хочу из Domino's", "закажи в Sakura"):
- **Only check** whether the restaurant delivers to the user's area.
- **Ignore** all other filters: stop-list ingredients, restaurant stop-list, min rating,
  preferred platforms, cuisine restrictions.
- Rationale: user has already decided; don't second-guess it.

### Preferred delivery platforms
Stored in `preferences.active_platforms[]` (default: all platforms active).
User can deactivate platforms via `/profile` → toggle list.
Search only queries active platforms. If a platform is deactivated, omit it silently.

### New preferences fields (Phase 3 migration)

```sql
alter table preferences
  add column if not exists preferred_restaurants  text[]   default '{}',
  add column if not exists restaurant_stop_list   text[]   default '{}',
  add column if not exists active_platforms       text[]   default '{"talabat","deliveroo","careem","noon","instashop"}',
  add column if not exists min_rating             numeric  default 4.0;
```

---

## Module: Cumulative Dashboard / TWA (P1 — Phase 6)

Weekly report sent every Sunday morning via Telegram message with a "Открыть дашборд" button
that opens a Telegram Web App (TWA — a mini web page inside Telegram).

### Report sections

**Финансы**
- Total saved this month vs. ordering on a single platform
- Breakdown: Talabat savings / Deliveroo savings

**Здоровье**
- Average "Health Index" of ordered dishes this week (calculated from КБЖУ data)
- Change vs. last week (+/- %)
- Most popular dish of the week

**География — «Исследователь города»**
- Map of UAE with pinned delivery points (gamification)
- Count of unique areas / restaurants tried

### Technical implementation

- TWA is a Next.js page at `/twa/dashboard` — served from Vercel
- Telegram opens it in an in-app browser, passing `initData` for auth
- Data fetched from Supabase via `/api/twa/dashboard?userId=...`
- Weekly cron: Vercel Cron Job (cron: `0 8 * * 0`) calls `/api/cron/weekly-report`
  which computes stats and sends the Telegram message to all active users

### New Supabase tables (Phase 6 migration)

```sql
-- Per-order КБЖУ log (populated when user places/confirms an order)
nutrition_log
  id uuid PK
  user_id uuid FK → users
  dish_name text
  restaurant text
  platform text
  calories int
  protein_g numeric
  fat_g numeric
  carbs_g numeric
  health_index numeric      -- 0–10, our composite score
  ordered_at timestamptz

-- Delivery geo-points for the city map
delivery_points
  id uuid PK
  user_id uuid FK → users
  area text
  lat double precision
  lng double precision
  restaurant text
  ordered_at timestamptz
```

---

## Webhook Registration (one-time setup)

After deploying to Vercel, register the webhook by opening this URL in a browser
(replace the three placeholders):

```
https://api.telegram.org/bot<BOT_TOKEN>/setWebhook
  ?url=https://<YOUR_VERCEL_URL>/api/telegram
  &secret_token=<TELEGRAM_WEBHOOK_SECRET>
```

Success response: `{"ok":true,"result":true,"description":"Webhook was set"}`

For local development: use ngrok (`ngrok http 3000`) to get a public URL,
then register that URL as the webhook temporarily.

---

## Security Rules

- **Never commit** `.env.local`, `.env`, or any file containing real keys to git
- `.env.local` is already in `.gitignore` — verified
- `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security — server-side only, never in client code
- `TELEGRAM_BOT_TOKEN` — rotate immediately if accidentally exposed
- All webhook handlers verify signatures before processing payloads

---

## Multilingual Implementation

- First `/start` → inline keyboard: `[🇷🇺 Русский] [🇬🇧 English] [🇸🇦 العربية]`
- Selection saved to `users.language` ('ru' | 'en' | 'ar')
- All bot text strings in `src/lib/i18n.ts` keyed by language code
- `/language` command to switch at any time
- Arabic renders RTL natively in Telegram — no special handling needed
