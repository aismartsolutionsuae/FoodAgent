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
