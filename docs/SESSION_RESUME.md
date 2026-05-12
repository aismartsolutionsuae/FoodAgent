# Session Resume — Phase 5 Architecture Review (PAUSED)

> Paused: 2026-05-12
> Resumes when user returns (estimated 2026-05-14 or later).
> **Delete this file once Phase 5 + Phase 6 are complete.**

## Context

Initialization session activated ADVISE mode (see CLAUDE.md `Communication conventions`) and started a retroactive review of all entries in `docs/DECISIONS.md`. User is processing critical refinements step-by-step before Phase 6 (record this work as Weekly Review #1).

## Critical refinements — status

| # | Topic | Status | Notes |
|---|---|---|---|
| 1 | Privacy stub | ✅ Recorded | DECISIONS.md `2026-05-12 — Privacy: minimal Telegram-bot stub` |
| 2 | VAT / Payments switch | ✅ Deferred | Moved to `STATUS.md → Open architectural questions`. Revisit at UAE business license milestone. |
| 3 | Pricing currency | ✅ Recorded | DECISIONS.md `2026-05-12 — Pricing currency: AED tax-inclusive`. Revisit when product targets non-UAE. |
| 4 | AI cost circuit breaker | ✅ Recorded | DECISIONS.md `2026-05-12 — AI cost circuit breaker`. Two-level: per-user $0.50 trial / $2 paid hard-kill; global $50/day alert + soft degrade gpt-5.4 → gpt-5.4-mini. |
| 5 | Whisper fallback flow | ⏳ NEXT | UX block when Whisper API down or audio corrupted. Decide minimum graceful fallback. |
| 6 | DB: RLS-as-default + cross-product user identity | ⏳ Pending | User confirmed willing to drop and rebuild Supabase (currently 5 migrations applied, DB empty). Two design choices: (a) RLS enabled by default on every table with per-table policies; (b) cross-product user identity — single `users.id` shared, or per-product distinct? |
| 7 | Branch protection with AI write access | ⏳ Pending | `.github/workflows/claude.yml` has `contents: write`. Need protected branch rules on `main`: required PR review, no force-push, etc. |

## Important refinements — sprint backlog (not yet processed)

- **AI model strategy: model fallback on degradation** — retry + degrade when OpenAI 5xx (separate from cost cap which is preventive).
- **Ready-made services: data residency check** — Langfuse / PostHog / BetterStack hosting region. UAE PDPL pref EU/local. User accepted minimal stub for PDPL; revisit if EU users appear.
- **Database: PITR backup plan** — Supabase plan tier + RPO/RTO targets.
- **Refund policy decomposition** — currently flat in DECISIONS.md. Industry-standard decomposition by product type / complaint type / time window / stakes drafted in audit (see archived conversation). Not critical until first paying user.
- **Voice cost ceiling per user** — partially covered by AI cost circuit breaker (per-user $/day applies to all OpenAI calls including Whisper).

## Deferred (not in this sprint)

- Branch protection as formal DECISIONS entry (minor)
- Cross-layer call pattern (event bus vs direct import) — only relevant once ≥2 cross-layer flows exist
- Custom-build criteria and vendor exit strategy
- Dunning policy (relevant on Stripe switch)
- `turbo.json` + CI matrix audit
- Local/remote criteria for Claude Code coding agent
- Cost ceiling on `claude-code-action` runs

## How to resume

1. Re-read this file
2. Skim `docs/DECISIONS.md` 2026-05-12 entries (1, 3, 4 already recorded)
3. Resume from **Step 5: Whisper fallback flow** — present options to user, get confirmation, record
4. Continue through Steps 6, 7, then process "Important refinements" backlog one by one
5. When user signals end of critical+important — execute **Phase 6**: write Weekly Architecture Review #1 to `docs/REVIEWS.md` (cover the entire audit retroactively), commit, push, delete this resume file

## Files touched this session

- `CLAUDE.md` — Communication conventions fully rewritten (ADVISE mode, source labeling, ⚠️ ACTION REQUIRED prefix, etc.); Weekly architecture review section added.
- `docs/STATUS.md` — VAT added to Open architectural questions.
- `docs/DECISIONS.md` — three new entries (Privacy stub, AED currency, AI cost circuit breaker).
- `docs/REVIEWS.md` — created, placeholder only (Review #1 still pending).
- `pnpm-workspace.yaml`, `package.json` — product-agnostic root (previous commit).
