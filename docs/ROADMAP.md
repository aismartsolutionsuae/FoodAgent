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
- **Schema drift** 🔴 `marketing/index.ts:112` selects `users.telegram_id` as email and filters by the absent `subscriptions` table (pre-omnichannel; **real drift, in scope**). `transport/telegram.ts` + `payments/index.ts` also reference `subscriptions` but are **opt-in by design, NOT dead** (DECISIONS 2026-05-16: subscription-model products only) — out of scope, do not touch.
- **Tests** 🔴 only `ai/costs.test.ts`. No tests for engine, `resolveUser` race, support middleware, or any of the 5 layers.
- **env / SaaS** — core set (Supabase, OpenAI, Telegram, owner, cron) ✅. Missing entirely: `LANGFUSE_*`, `POSTHOG_*`, `BETTERSTACK_API_TOKEN`, `RESEND_API_KEY`, `ADMIN_BOT_TOKEN/WEBHOOK`.
- **Shared instructions** — shared (`project_id=NULL`) prompts seeded only for marketing (`002_marketing_prompts.sql`). Support / QA / Experiments shared role-prompts missing.
- **Tree cruft** 🟡 `projects/food-agent/` ~2390 files physically on disk, 0 git-tracked (archived as tag `food-agent-archive`). `projects/_template/` raw, duplicate `bot.ts`/`src/bot.ts`.
- **Deferred by decision** — Anthropic key *for product AI calls* (CLAUDE.md model strategy #1 — end-user models only), Stripe/LemonSqueezy (billing product-type-driven), Buffer (no brand/product yet), n8n (not deployed). NOTE: Anthropic key *for the coding harness* (interactive + Layer-4 autonomous coder) is a separate axis, NOT deferred — quality-first, provisioned on demand.

## Wave 3 — decomposition (order = dependency)

Each sub-stage = its own commit/PR (code → PR per convention; docs direct). Tick here on merge.

- [x] **3.1 Cleanup** (no external steps): physically delete `projects/food-agent/`; drop `SCRAPER_*` + LemonSqueezy stub vars from `.env.local`. (transport/payments subscription code is opt-in by design — NOT touched.) — *done 2026-05-16: dir deleted (0 git-tracked, tag `food-agent-archive` intact), `SCRAPER_*`/`LEMONSQUEEZY_*` removed from `.env.local`, `pnpm install --frozen-lockfile` + `pnpm typecheck` (6/6) green.*
- [ ] **3.2 Schema alignment** (marketing only): rework `marketing.publishEmailCampaign` onto `user_identities` email channel; `audience` trial/paid throws an actionable error (billing deferred until product, DECISIONS 2026-05-16).
- [ ] **3.3 Prompt-table compliance**: support/qa currently bypass the `prompts` table (sentiment hardcoded + direct provider call; qa judge passes prompt text as prompt name → empty content). Refactor both to named shared prompts via `ask()`/`judge()` + seed migration `005_shared_agent_prompts.sql`. (Experiments has no AI calls — none needed.)
- [ ] **3.4 SaaS wiring** ⚠️ requires founder portal/key steps: Langfuse, PostHog, BetterStack, Resend, admin-bot Telegram — one at a time, each with a smoke check.
- [ ] **3.5 Smoke harness**: one stub check per layer — engine ping, support triage on fixture, experiments getFlag, qa judge, marketing dry-run (5 bot-core layers) **+ Layer-4 autonomous coder** (claude-code-action: a stub `@claude` trigger on a throwaway issue opens a no-op PR, proving the autonomous path works). Runnable locally / in CI. Layer-4 autonomous coder is tested here, NOT deferred to first product.
- [ ] **3.6 Tests**: unit tests for each layer's pure logic + `resolveUser` race.

**Wave 3 done =** all sub-stages merged; smoke harness green in CI; no schema-drift references; 5 layers each reach their dependency or honestly stubbed with a recorded reason.

## Maintenance rule

When a sub-stage merges, update its checkbox + Evidence here in the same change. When a
wave completes, flip its status row and add the closing commit hash. This file is the
single source of truth for "where are we" — keep it current or the session-loss problem returns.
