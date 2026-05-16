# Infrastructure Roadmap — Waves

> Living document. Survives across sessions. Read at session start (CLAUDE.md always-read-first #4).
> Append/update status here as waves progress. Rationale for *decisions* still goes to DECISIONS.md;
> this file tracks *what is built, what remains, in what order*.

## Why this file exists

The Waves plan previously lived only in commit messages and REVIEWS.md — not in any
always-read-first doc. Every new session started blind to the plan, causing repeated
context loss (observed 2026-05-16). This file is the durable fix: the roadmap is now
part of the always-read-first protocol.

## Waves overview

| Wave | Scope | Status | Evidence |
|------|-------|--------|----------|
| 1 | CLAUDE.md / repo structure / FROZEN banner / path conventions | ✅ done | `c5fc7fd` |
| 2 | billing-model principle, locale base+project merge, `project_config`, per-product deploy template, omnichannel `resolveUser` + transport realign | ✅ done | `96c0e8e` |
| **3** | **Operability of all 5 shared layers** (decomposed below) | 🟡 in progress | — |
| 4 | Select first training product + run idea-development playbook (only once infra is stable) | ⏳ blocked on Wave 3 | — |

## Audit snapshot — 2026-05-16 (commit `87543b2`)

State at the start of Wave 3. Findings drive the Wave 3 sub-stages.

- **AI engine** ✅ correct (`ask/judge/stream`, prompt cache, shared/project prompt fallback, Langfuse hooks, cost logging). Langfuse silently disabled — no `LANGFUSE_*` in env.
- **Schema drift** 🔴 `subscriptions` table referenced in `marketing/index.ts`, `transport/telegram.ts`, `payments/index.ts` but **defined in no migration** (DECISIONS 2026-05-16 removed it as a principle; code never cleaned). `marketing/index.ts:112` selects `users.telegram_id` as email — pre-omnichannel schema.
- **Tests** 🔴 only `ai/costs.test.ts`. No tests for engine, `resolveUser` race, support middleware, or any of the 5 layers.
- **env / SaaS** — core set (Supabase, OpenAI, Telegram, owner, cron) ✅. Missing entirely: `LANGFUSE_*`, `POSTHOG_*`, `BETTERSTACK_API_TOKEN`, `RESEND_API_KEY`, `ADMIN_BOT_TOKEN/WEBHOOK`.
- **Shared instructions** — shared (`project_id=NULL`) prompts seeded only for marketing (`002_marketing_prompts.sql`). Support / QA / Experiments shared role-prompts missing.
- **Tree cruft** 🟡 `projects/food-agent/` ~2390 files physically on disk, 0 git-tracked (archived as tag `food-agent-archive`). `projects/_template/` raw, duplicate `bot.ts`/`src/bot.ts`.
- **Deferred by decision** — Anthropic key (CLAUDE.md model strategy #1), Stripe/LemonSqueezy (billing product-type-driven), Buffer (no brand/product yet), n8n (not deployed).

## Wave 3 — decomposition (order = dependency)

Each sub-stage = its own commit/PR (code → PR per convention; docs direct). Tick here on merge.

- [ ] **3.1 Cleanup** (no external steps): physically delete `projects/food-agent/`; remove dead `subscriptions`/`telegram_id` queries in marketing/transport/payments to match DECISIONS 2026-05-16; drop `SCRAPER_*` + LemonSqueezy stub vars from `.env.local`.
- [ ] **3.2 Schema alignment**: rework `marketing.publishEmailCampaign` onto `user_identities` (email channel), or honestly stub until product selected (audience filters depend on absent billing).
- [ ] **3.3 Shared instructions**: seed shared (`project_id=NULL`) prompts for support / qa / experiments, mirroring `002_marketing_prompts.sql`.
- [ ] **3.4 SaaS wiring** ⚠️ requires founder portal/key steps: Langfuse, PostHog, BetterStack, Resend, admin-bot Telegram — one at a time, each with a smoke check.
- [ ] **3.5 Smoke harness**: one stub check per layer (engine ping, support triage on fixture, experiments getFlag, qa judge, marketing dry-run) — runnable locally and in CI.
- [ ] **3.6 Tests**: unit tests for each layer's pure logic + `resolveUser` race.

**Wave 3 done =** all sub-stages merged; smoke harness green in CI; no schema-drift references; 5 layers each reach their dependency or honestly stubbed with a recorded reason.

## Maintenance rule

When a sub-stage merges, update its checkbox + Evidence here in the same change. When a
wave completes, flip its status row and add the closing commit hash. This file is the
single source of truth for "where are we" — keep it current or the session-loss problem returns.
