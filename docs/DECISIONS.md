# Architecture Decisions Log

Append-only. Each entry: date, decision, reasoning, alternatives considered.

---

## 2026-05-11 — Repository renamed: FoodAgent → Portfolio

**Decision**: Repository renamed from `FoodAgent` to `Portfolio` on GitHub. FoodAgent becomes one of many products in `projects/food-agent/`.

**Reasoning**: Repository serves as infrastructure for multiple products, not a single product. Original naming was an artifact of starting with one product idea before pivoting to portfolio approach.

**Alternatives considered**: Keeping FoodAgent name (rejected — misleading). Creating new repo from scratch (rejected — loses history and breaks references).

---

## 2026-05-11 — Model strategy: OpenAI-first, Anthropic only for long-context legal

**Decision**: All AI calls default to OpenAI. Provider hierarchy:
- Conversational, creative, query parsing — gpt-5.4
- RAG responder — gpt-5.4-mini
- Classification, triage, judge — gpt-4o-mini
- Structured extraction, analytics — gpt-4o
- Embeddings — text-embedding-3-small
- Long-context legal (when activated) — claude-opus-4-7

Anthropic API key is NOT required until a legal/long-context product is activated.

**Reasoning**: OpenAI API already paid and configured. For conversational and creative tasks, gpt-5.4 quality is competitive with Claude Sonnet at similar effective cost. Anthropic premium is only justified for long-context coherence (>50K tokens) on legal documents. Single-provider default reduces operational complexity for solo founder.

**Alternatives considered**:
- All-Anthropic stack (rejected — paying premium without measurable quality gain on short Telegram dialogues).
- Split conversational/creative between Anthropic and OpenAI from day 1 (rejected — premature optimization).

---

## 2026-05-11 — Repository structure: portfolio monorepo with 5-layer architecture

**Decision**: Monorepo with three top-level workspaces (`packages/`, `platform/`, `projects/`) and 5 parallel AI agent layers (Marketing, Support, A/B Testing, Coding, QA). Each layer lives in defined location:
- Marketing → `platform/automation/`
- Support → `packages/bot-core/src/support/` + per-project integration
- A/B Testing → `packages/bot-core/src/experiments/`
- Coding → `.github/workflows/` (claude-code-action)
- QA → `packages/bot-core/src/qa/` + `platform/monitor/`

**Reasoning**: Modularity allows new products to reuse infrastructure with minimal duplication. Each layer has clean public API; layers don't know each other's implementation details.

---

## 2026-05-11 — Ready-made services over custom code

**Decision**: Use established services for AI observability, monitoring, experiments, vector search, social posting, automation:
- Langfuse — AI tracing, scoring, judge framework
- BetterStack — errors + uptime
- PostHog — analytics + experiments + session replays
- pgvector in Supabase — vector search for RAG
- Buffer — social posting
- n8n — workflow orchestration

**Reasoning**: Custom implementations of these would consume weeks of solo-founder time without quality advantage. Production-grade services with millions of users will outperform single-developer custom code in reliability and feature coverage.

**Alternatives considered**: Custom QA framework, custom session replay summarizer, custom anomaly detection (all rejected — replaced by listed services).

---

## 2026-05-11 — Payments: Lemon Squeezy now, Stripe later

**Decision**: Lemon Squeezy as Merchant of Record for all products until founder obtains UAE business license. Switch to Stripe per-product when product sustains 5–10k AED/mo MRR for 3 months.

**Reasoning**: LS doesn't require UAE entity (works for solo founder without business setup). Stripe in UAE requires local company registration ($5–25k upfront + ongoing fees). PaymentService abstraction in `bot-core/payments` allows per-product provider switch without code changes.

---

## 2026-05-11 — Database: Supabase as single data platform

**Decision**: Supabase (Postgres + Auth + RLS + Realtime + pgvector + Storage) as the single data platform across all products.

**Reasoning**: Bundles capabilities that would otherwise need 4+ services (Postgres + Auth0 + Pinecone + S3 + WebSocket service). pgvector handles RAG embeddings natively — no separate vector DB needed.

---

## 2026-05-11 — Refund policy: manual approve only

**Decision**: All refund requests go to `approval_queue` for founder review. No auto-refund logic, even for small amounts or within trial period.

**Reasoning**: Auto-refunds create abuse vector and remove signal about why users churn. Manual review is fast (Telegram approval button) and preserves customer feedback loop.

**Alternatives considered**: Auto-refund under $50 within 24h (rejected — risk outweighs convenience for solo founder).

---

## 2026-05-12 — Voice input: Whisper as standard cross-product capability

**Decision**: OpenAI Whisper (`whisper-1`) as the single transcription solution across all products. Lives in `packages/bot-core/src/voice/` — exports `transcribe()`. Voice messages are converted to text before entering the standard message pipeline. Required in every user-facing interface.

**Reasoning**: Voice messages are a primary communication format in Telegram for a significant user segment in UAE. Standardising at infrastructure level means every product gets it for free without product-level implementation. Direct OpenAI SDK call is acceptable here — `voice/` is infrastructure code, not product code.

**Alternatives considered**: Product-level implementation per bot (rejected — duplication). Routing through `ask()` (rejected — different API surface, transcription ≠ completion).

---

## 2026-05-12 — Monorepo workspace config: product-agnostic root

**Decision**: Root `package.json` scripts contain only generic commands (`dev`, `build`, `typecheck`, `test`). Product-specific shortcuts removed. `pnpm-workspace.yaml` uses `projects/*/worker` glob instead of hardcoded `projects/food-agent/worker`.

**Reasoning**: Root config is shared infrastructure — hardcoding product names breaks the portfolio pattern and requires manual updates for each new product.

---

## 2026-05-11 — Coding agent: Claude Code in Cursor + claude-code-action

**Decision**: Primary coding workflow is Claude Code inside Cursor on developer's laptop (~90% of work, interactive). Fallback is `anthropics/claude-code-action` triggered via GitHub Issue/PR comments containing `@claude` mention (~10%, for emergency fixes when laptop unavailable).

**Reasoning**: Interactive coding with human-in-loop produces better quality than fully autonomous. Remote mode exists as escape hatch, not default.

---

## 2026-05-12 — Privacy: minimal Telegram-bot stub, deferred deep compliance

**Decision**: Privacy approach for MVP — four components, no more:

1. Static Privacy Policy page per product at `projects/[name]/src/app/privacy/page.tsx`.
2. One-line mention at end of `/start` welcome message: "By using this bot, you agree to the Privacy Policy: [link]".
3. `/privacy` command in `bot-core` returns short summary plus link.
4. `/delete` command in `bot-core` removes user row from Supabase (with FK cascades), deletes Langfuse traces, deletes PostHog events.

Canonical English Privacy Policy text (to be localized via i18n for RU/AR):

> Your messages (text and voice) are sent to OpenAI for processing.
> According to their public policy (openai.com/policies/api-data-usage-policies),
> API data is NOT used to train their models and is deleted from their side
> within 30 days.
>
> The /delete command removes your data from our systems (Supabase, Langfuse,
> PostHog). On the OpenAI side, data is automatically deleted within 30 days
> of last use.

Not done deliberately: per-call consent prompts, PII redaction before AI calls, consent-timestamp tracking, data-residency wrappers for third-party services.

**Reasoning**: Telegram-based MVP for UAE market — practical PDPL enforcement risk near-zero for solo founder. The four-component stub is industry standard for AI Telegram bots (also Telegram's own Bot Privacy guidelines, mandatory for monetized bots since 2024) and provides a legal pointer at minimal UX cost. Deeper compliance is premature optimization until scale or jurisdictional exposure (e.g., EU users) justifies it.

**Alternatives considered**:
- Per-message AI consent prompt (rejected — UX-hostile).
- Full PII redaction pipeline (rejected — engineering cost > MVP risk).
- No privacy infrastructure at all (rejected — even minimum is industry standard; /delete is implicit PDPL requirement).

**Revisit when**: first EU user appears OR UAE business license obtained OR external audit/complaint.

---

## 2026-05-12 — Pricing currency: AED tax-inclusive for UAE products

**Decision**: Default pricing display is AED, tax-inclusive. Applies to all products targeting UAE B2C market. Lemon Squeezy is configured to show AED on checkout. Settlement currency to founder is whatever LS pays out (USD/EUR), but user never sees this.

**Reasoning**: AED tax-inclusive is the universal B2C standard in UAE (Careem, Talabat, Noon, telecom apps). Removes cognitive friction of currency conversion.

**Alternatives considered**: USD-only (rejected — foreign-feeling reduces conversion in UAE consumer apps). AED+USD with geo-detection (deferred — premature for single-market MVP).

**Revisit when**: a specific product is built for or scales to international (non-UAE) audience. In that case, currency display is revisited within that project's scope — likely AED for UAE users + USD (or auto-detected local currency) for others via geo-detection. This default does not propagate automatically across products that change target market.

---

## 2026-05-12 — AI cost circuit breaker: two-level budgeting

**Decision**: AI cost protection at two levels.

**Per-user daily cap (hard kill)**:
- Trial / no active subscription: **$0.50/day**
- Active paid subscription: **$2.00/day**
- Behavior on hit: return a friendly error to user ("Daily limit reached, please try again tomorrow"). Block further AI calls for that user until UTC midnight.

**Global daily cap (alert + soft degradation)**:
- Threshold: **$50/day** across entire portfolio.
- Behavior on hit: fire one alert to admin-bot. Soft-degrade `gpt-5.4` → `gpt-5.4-mini` for all calls portfolio-wide until UTC midnight. Other model tiers unchanged (already minimum or correctness-critical — see degradation matrix below).
- Degradation auto-clears at UTC midnight (new day, new budget).

**Degradation matrix**:

| Task | Default | When global cap hit |
|---|---|---|
| Conversational, creative, query parsing, escalation summary | gpt-5.4 | gpt-5.4-mini |
| RAG responder | gpt-5.4-mini | (no change — already mini) |
| Sentiment, triage, judge | gpt-4o-mini | (no change — already minimum) |
| Structured extraction, analytics | gpt-4o | (no change — correctness-critical, downgrade would break JSON format) |
| Embeddings | text-embedding-3-small | (no change — negligible cost) |
| Whisper | whisper-1 | (no change — no cheaper alternative) |

**Implementation**: middleware in `packages/bot-core/src/ai/index.ts` — before each `ask()` / `stream()` / `judge()` call, query `SUM(cost_usd_est)` from `portfolio_events` filtered by `event_name='ai:cost'` and current UTC day. Compare against per-user cap (subscription status from `subscriptions` table) and global cap. Caching of daily totals deferred until query load is measured.

**Reasoning**: Two-level system balances abuse protection (per-user hard cap) with service continuity during cost spikes (global degrade keeps app alive at lower quality). Cost is already tracked in `portfolio_events` via `logAiCost()`, so no new data plumbing needed. Specific thresholds ($0.50 / $2 / $50) are starting hypotheses — calibrate from real logs after first month of usage.

**Alternatives considered**:
- Hard kill globally (rejected — kills service for all users at once, worse UX than degraded service).
- Alert-only globally (rejected — relies on founder being available to respond manually).
- Single flat cap regardless of subscription (rejected — does not differentiate paying customers from abuse).

---

## 2026-05-14 — Voice transcription fallback flow

**Decision**: `transcribe()` in `packages/bot-core/src/voice/` returns a discriminated union, never throws. Three failure buckets, each maps to a localized user message via i18n:

| Reason | Trigger | Canonical English message |
|---|---|---|
| `api_error` | OpenAI 5xx, network failure, rate limit | "Couldn't transcribe right now — please try again or send text." |
| `too_large` | Audio > 25 MB (Whisper hard limit) | "Voice message too long — please send shorter audio or text." |
| `empty_result` | Whisper returns empty string | "Couldn't make out what you said — please try again or send text." |

Type shape:

```ts
type TranscribeResult =
  | { ok: true; text: string }
  | { ok: false; reason: 'api_error' | 'too_large' | 'empty_result' }
```

Product handlers do a single `if (!result.ok) ctx.reply(i18n.t('voice.error.' + result.reason))`. Text alternative is always offered. No retry buttons, no streaming, no soft time limits (cost cap from AI-cost-circuit-breaker decision handles abuse).

**Reasoning**: Universal voice-assistant UX pattern (ChatGPT app, voice Telegram/Discord bots) — never silent, never crash, always offer text. Three buckets is the right granularity — finer distinctions don't change what the user does next (retry or switch to text). Discriminated union over throws keeps caller code one branch and forces compile-time handling of all cases.

**Adjacent (not part of this decision, decide at `voice/` implementation time)**: Whisper `language` param — default auto-detect for UAE RU/EN/AR mix; pass user's `i18n.language` as hint if set in profile.

**Alternatives considered**:
- Throw typed errors (rejected — discriminated union is cleaner in TypeScript, forces handler to address all cases).
- Single generic error message (rejected — `too_large` benefits from explicit "shorter" hint).
- Retry button on error message (rejected — Telegram users naturally re-record without prompt).

---

## 2026-05-15 — User data model: per-product isolation, omnichannel identity, RLS-default

**Decision**: All shared migrations rebuilt (Supabase DB empty, no data loss). Canonical user model:

- **`users`** (shared, owned by `packages/database/migrations/`): channel-agnostic person record — `id, project_id, language, created_at`. One row per (person, project_id) — per-product isolation.
- **`user_identities`** (shared): `id, user_id` FK (ON DELETE CASCADE), `project_id` (denormalized from users for the unique constraint), `channel` CHECK ('telegram'|'web'|'whatsapp'), `channel_user_id`, `created_at`, `UNIQUE(channel, channel_user_id, project_id)`. `whatsapp` provisioned in enum though unused.
- Product-specific user data (onboarding, profile) → `projects/[name]/migrations/`, FK to `users.id`.
- bot-core gets a `resolveUser(channel, channelUserId, projectId)` helper (upsert-or-get) — written once, every product and channel reuses it.
- At MVP: each channel identity → its own users row. Auto cross-channel linking deferred; schema supports it without future migration.

**RLS**: enabled on every table in `public` schema with NO policies — anon/authenticated denied by default; `service_role` (used by all bots and migrations) bypasses RLS, so bots are unaffected. Defense-in-depth for future client-side (dashboard / Telegram Web App) access.

**Migration ownership**: shared tables (`users`, `user_identities`, `bot_sessions`, `portfolio_events`, `prompts`, `approval_queue`, support/qa/marketing infra) → `packages/database/migrations/`. Product-specific tables → `projects/[name]/migrations/`. Shared migrations must be self-contained — fixes prior bug where `users` was silently owned by food-agent's product migration while shared migrations referenced `users(id)`.

**Reasoning**: Per-product isolation gives clean PDPL `/delete` (delete users row → identities cascade, analytics rows anonymized via existing `ON DELETE SET NULL`) plus independent product lifecycle, continuing the established `project_id` discriminator pattern (already used in prompts/portfolio_events/approval_queue). Omnichannel person+identities split is standard CDP/identity-resolution design (Segment, Twilio, Auth0, Supabase Auth all model it this way) — provisioned now because changing the identity model after data exists is the most painful migration class. RLS-default is Supabase official guidance; near-zero cost on empty DB vs expensive retrofit after an incident.

**Alternatives considered**:
- Shared identity keyed by telegram_id (rejected — couples products, blocks clean per-product deletion, not omnichannel).
- Channel-specific columns on users (`telegram_id`, `whatsapp_id`, ...) (rejected — sparse, not extensible, no account-linking path).
- Separate Supabase project per product (rejected — contradicts single-platform decision).
- Auto cross-channel linking at MVP (deferred — hard identity-resolution problem; schema is linking-ready for later).

**Revisit when**: bundling / unified billing considered (would favor cross-product identity linking); web auth method chosen (defines what web's `channel_user_id` holds — see STATUS open questions); account-linking flow built.

---

## 2026-05-15 — Branch protection with AI write access

**Decision**: `main` is protected — no direct pushes, all changes via PR. Settings: require PR before merge, 0 required approvals (solo founder), require `pr-check` status check green before merge, no force-push, no branch deletion. `claude-code-action` keeps `contents: write` (needs it for branch/PR commits) but cannot reach `main` directly — protection blocks it. `claude.yml` gets a `concurrency` group and `timeout-minutes` to cap runaway Actions/token spend.

**Reasoning**: Standard posture for repos with AI write access — AI proposes via PR, never commits to main unreviewed. Required human reviewer is impossible solo, so the gate is CI (typecheck/test) + self-merge rather than peer review. Timeout/concurrency caps protect against a looping action burning GitHub minutes and Claude tokens.

**Alternatives considered**: Required human review (rejected — solo founder, self-blocking). No protection (rejected — defeats the security concern that prompted this). Full enterprise lockdown (rejected — over-engineered for one person).

---

## 2026-05-15 — Working protocol: decision batching + model-switch notification

**Decision**: Two collaboration rules, enforced via CLAUDE.md `Communication conventions` (the always-read operating manual); logged here only for rationale history.

1. **Decision batching**: related decisions sharing context and risk level may be presented and recorded as one consolidated proposal, instead of strictly one-at-a-time. Reduces conversation round-trips without reducing reasoning depth.
2. **Model / effort / thinking-switch notification**: at the end of a stage, if the next stage would benefit from a different model, reasoning effort, or extended thinking, Claude explicitly notifies the user and waits for the switch before proceeding. Never switch or assume silently.

**Reasoning**: Round-trip overhead and running an expensive model on mechanical work were the two biggest avoidable costs against the daily limit. Batching cuts turns; explicit model-switch prompts let the user run strategic work on a stronger model and mechanical work on a cheaper one without losing control. Operating rules live in CLAUDE.md (executed every session); DECISIONS.md only records why.

**Alternatives considered**: Rule in DECISIONS.md only (rejected — DECISIONS.md is history, not executed; rule would not be followed in future sessions). Auto-switch model without asking (rejected — user must retain control over model/cost).

---

## 2026-05-15 — AI call resilience: retry + fallback chain

**Decision**: On OpenAI 5xx / timeout / 429 in `packages/bot-core/src/ai`: retry 2× with exponential backoff (~1s, ~4s). Still failing → one attempt on the tier's degradation target (gpt-5.4 → gpt-5.4-mini per existing degradation matrix; gpt-4o / structured-extraction stays — correctness-critical, no degrade). Still failing → return a typed error to caller (same discriminated-union pattern as the Whisper fallback decision). All retries and fallbacks recorded in the Langfuse trace.

**Reasoning**: Standard resilience pattern (OpenAI cookbook exponential backoff; Stripe/AWS SDK retry conventions). Reuses the already-defined degradation matrix and the discriminated-union error convention — introduces no new patterns. Distinct from the AI cost circuit breaker: this is reactive to provider failure, the circuit breaker is preventive of spend.

**Alternatives considered**: Fail immediately on first error (rejected — transient 5xx/429 are common and recoverable). Infinite retry (rejected — burns latency and tokens, worse UX than a clean typed error). Degrade gpt-4o too (rejected — structured extraction correctness would break).

---

## 2026-05-15 — Refund policy decomposed (supersedes flat 2026-05-11 manual-only)

**Decision**: Binary outcome only — approve or decline, no pause/downgrade. Routing by objective signals; manual reserved for the one judgment-needing case.

| Case | Action |
|---|---|
| System-detected technical failure (payment captured, no successful delivery/generation event, or logged error on the transaction) | **AUTO-APPROVE** |
| Request outside the stated refund window (timestamp-based), product delivered, no technical-failure signal | **AUTO-DECLINE** |
| One-time digital good delivered, no technical-failure signal, policy = no-refund-after-delivery | **AUTO-DECLINE** |
| Duplicate request / already refunded | **AUTO-DECLINE** |
| Hard abuse signal: same user already received ≥ N refunds (N configurable) | **AUTO-DECLINE + flag** |
| In refund window, delivered, no technical failure, subjective complaint (quality / remorse) | **MANUAL: approve or decline** |

Auto-approve trigger MUST be system-detected, never user-claimed. A user merely saying "it didn't work" is subjective → manual. All auto-decline messages include an appeal line ("reply if you think this is a mistake"); a reply routes to `approval_queue` as a manual-review item.

**User messaging** (canonical English, localized via i18n keys `refund.*`):
- Auto-approve: "We detected a technical issue with your purchase and refunded it in full. The amount returns to your payment method within [X] business days. Sorry for the trouble — you're welcome to try again anytime."
- Decline (policy / out-of-window): "We've reviewed your refund request. It falls outside our refund policy [link], so we're unable to refund in this case. If you think this is a mistake, just reply to this message."

**Reasoning**: Mirrors app-store / Paddle / Gumroad standard for simple digital goods — objective cases automated, the chargeback-sensitive subjective in-window case stays human (auto-declining "I'm not satisfied" within window is the top chargeback trigger industry-wide). Appeal line on every auto-decline is standard chargeback defense at near-zero added complexity. Reconciles industry decomposition with the prior deliberate manual-gate intent (anti-abuse + churn signal) by keeping the one subjective bucket manual rather than abandoning the gate entirely.

**Alternatives considered**: Full flat manual-only (rejected — superseded; too much manual for objective cases). Auto-decline subjective in-window complaints (rejected — top chargeback/dispute trigger). pause/downgrade alternatives in messaging (rejected — user wants binary approve/decline only, less complexity).

**Revisit when**: products grow beyond simple (tiered subscriptions, B2B, annual) — then reconsider pro-rata, pause/downgrade offers, finer abuse detection, per-product-type windows. Model is intentionally scoped to current simple products.

---
