# Architecture Reviews Log

Append-only log of weekly architecture reviews. Most recent on top.

Schedule: every 7+ days, self-initiated by Claude Code at session start.

---

## 2026-05-15 — Weekly Architecture Review #1

### Scope reviewed
- DECISIONS.md (18 entries, 2026-05-11 … 2026-05-15)
- Repo structure at commit 1e6c601 (post food-agent removal)
- STATUS.md current state

### Findings — flat decisions that should be decomposed
1. **Refund policy (2026-05-11)**: still flat ("manual approve only"). Industry-standard decomposition (product type × complaint type × time window × stakes) was drafted during Phase 5 audit but not recorded as a replacement entry. User deferred — not critical until first paying user. Action: decompose before first product with a paywall.

### Findings — decisions misaligned with current context
1. **Repository structure / 5-layer (2026-05-11)**: lists Marketing → `platform/automation/` which does not exist (n8n not deployed). Historical entry, append-only — not edited; tracked as Волна 3 gap (Marketing layer wiring).
2. No other misalignments — entries 2026-05-12…15 are fresh, already decomposed this session.

### Findings — repo structure issues
1. **`subscriptions` table**: referenced generically by bot-core (transport, payments) but has NO shared migration (orphaned by food-agent removal). Decision needed Волна 2: add shared migration (likely — billing is shared infra) vs product-specific.
2. **`bot-core/transport/telegram.ts`**: queries `users` by `telegram_id` — wrong vs new schema. Needs `resolveUser(channel, channelUserId, projectId)` helper. Волна 3.
3. **`packages/bot-core/locales/`**: referenced by `i18n/index.ts` but does not exist. Волна 2. **[Corrected 2026-05-16: factually wrong — the dir and ru/en/ar .ftl files DID exist since 2026-04-29. Real issue was only the unwired loader (dead `botCoreLocalesDir` var). Fixed in Волна 2: loader rewritten to merge base+project; decided refund/voice keys added to existing files.]**
4. **`projects/_template/`**: raw/incomplete. Project template to be rebuilt on a real test product, not reused as-is.
5. **Improvement**: with food-agent removed, no product code does direct OpenAI SDK calls — `ask()`/`judge()`-only principle now clean across the tree.

### Findings — technical debt
1. Deferred from Phase 5 audit, not yet processed: data-residency check (Langfuse/PostHog/BetterStack regions vs UAE PDPL), PITR backup plan (Supabase tier + RPO/RTO).
2. Branch protection: decision recorded; GitHub UI settings being applied by user; required-status-check gate deferred until first PR runs `pr-check`.

### No action needed
1. All 2026-05-12…15 decisions: fresh, decomposed, aligned.
2. Ready-made services, Supabase single-platform, model strategy, privacy stub, AED currency, cost circuit breaker, AI resilience, omnichannel data model: aligned with current context.

### Next review scheduled
On or after: 2026-05-22
