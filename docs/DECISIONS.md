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
