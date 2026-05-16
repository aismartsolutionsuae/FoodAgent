# Wave 3 Part A — Infra Hygiene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove tree cruft, eliminate the one real schema-drift in the shared marketing flow, and bring support/qa AI calls into compliance with the "prompts live in Supabase, all AI via ask()/judge()" principle.

**Architecture:** Three sequential sub-stages (3.1 cleanup → 3.2 marketing schema alignment → 3.3 prompt-table compliance). Part A has no external/portal blockers and produces a clean, fully-testable state on its own. Part B (SaaS wiring → smoke harness → broader unit tests) is a separate plan, gated on founder portal/key steps.

**Tech Stack:** TypeScript (strict), pnpm workspace + turbo, vitest, Supabase (Postgres) SQL migrations, grammY.

**Out of scope / by design (do NOT touch):** `transport/telegram.ts` `createSubscriptionMiddleware`, `payments/index.ts` subscription queries, `extendTrial`, `DbSubscription` — these are intentionally opt-in and dormant per DECISIONS.md 2026-05-16 (billing is product-type-driven; subscription-model products only). They are not dead code.

**Test/typecheck commands (exact):**
- Single test: `pnpm --filter @portfolio/bot-core exec vitest run <relative/path.test.ts>`
- Package typecheck: `pnpm --filter @portfolio/bot-core typecheck`
- Repo typecheck: `pnpm typecheck`

---

## File Structure

| File | Responsibility | Change |
|------|----------------|--------|
| `projects/food-agent/` | archived product (git tag `food-agent-archive`), 0 git-tracked files | DELETE (local fs) |
| `.env.local` | local secrets | remove dead `SCRAPER_*` + `LEMONSQUEEZY_*` stub vars (local only, not committed) |
| `packages/bot-core/src/marketing/index.ts` | marketing layer | rework `publishEmailCampaign` off `subscriptions`/`users.telegram_id` |
| `packages/bot-core/src/marketing/index.test.ts` | marketing tests | CREATE |
| `packages/database/migrations/005_shared_agent_prompts.sql` | shared (`project_id=NULL`) prompts for support/qa | CREATE |
| `packages/bot-core/src/support/sentiment.ts` | sentiment classification | refactor to `ask('support:sentiment', …)` |
| `packages/bot-core/src/support/sentiment.test.ts` | sentiment tests | CREATE |
| `packages/bot-core/src/qa/judge.ts` | QA reply judge | refactor to engine `judge('qa:reply_judge', …)` |
| `packages/bot-core/src/qa/judge.test.ts` | qa judge tests | CREATE |

---

## Task 1: 3.1 — Delete food-agent cruft

**Files:**
- Delete: `projects/food-agent/` (entire directory; 0 git-tracked files, archived as tag `food-agent-archive`)

- [ ] **Step 1: Confirm nothing under food-agent is git-tracked**

Run: `git ls-files projects/food-agent`
Expected: empty output (zero lines).

- [ ] **Step 2: Confirm the archive tag exists (recovery path intact)**

Run: `git tag --list food-agent-archive`
Expected: prints `food-agent-archive`.

- [ ] **Step 3: Delete the directory (PowerShell)**

Run: `powershell -Command "Remove-Item -Recurse -Force projects/food-agent"`

- [ ] **Step 4: Verify workspace still installs and typechecks**

Run: `pnpm install --frozen-lockfile`
Expected: completes without error (food-agent was untracked → lockfile unaffected).

Run: `pnpm typecheck`
Expected: PASS (no project references food-agent).

- [ ] **Step 5: No commit needed**

`git status --porcelain` shows no changes (directory was untracked). Note in `docs/ROADMAP.md` checkbox 3.1 partial — full 3.1 tick after Task 2.

---

## Task 2: 3.1 — Remove dead env vars (local only)

**Files:**
- Modify: `.env.local` (gitignored — local only, never committed)

- [ ] **Step 1: Remove the lines**

Delete every line in `.env.local` whose key starts with `SCRAPER_` (`SCRAPER_WORKER_URL`, `SCRAPER_WORKER_SECRET`, `SCRAPER_MOCK`) or `LEMONSQUEEZY_` (`LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_STORE_ID`, `LEMONSQUEEZY_PRODUCT_ID`, `LEMONSQUEEZY_WEBHOOK_SECRET`, `LEMONSQUEEZY_CHECKOUT_URL`). Rationale: `SCRAPER_*` is a food-agent tail; `LEMONSQUEEZY_*` are 5–6 char stubs and billing is deferred (DECISIONS 2026-05-16).

- [ ] **Step 2: Verify**

Run: `powershell -Command "Select-String -Path .env.local -Pattern '^SCRAPER_|^LEMONSQUEEZY_'"`
Expected: empty output.

- [ ] **Step 3: Tick ROADMAP 3.1**

Edit `docs/ROADMAP.md`: change `- [ ] **3.1 Cleanup**` to `- [x] **3.1 Cleanup**`, append evidence note. Commit docs direct to main:
```bash
git add docs/ROADMAP.md
git commit -m "docs(roadmap): tick 3.1 cleanup (food-agent + dead env vars)"
git push
```

---

## Task 3: 3.2 — Marketing schema alignment

**Context:** `publishEmailCampaign` ([marketing/index.ts:111-136](packages/bot-core/src/marketing/index.ts#L111)) selects `users.telegram_id` aliased as `email` (pre-omnichannel; telegram users have no email there) and filters by the non-existent `subscriptions` table. Per DECISIONS 2026-05-16 there is no billing table until a product is selected, so `audience` of `trial`/`paid` cannot be resolved. Decision: resolve `audience: 'all'` against the omnichannel `user_identities` email channel; for `trial`/`paid` throw a clear, recorded error (same graceful-degradation contract as `publishSocialPost` which throws an actionable message when Buffer is absent).

**Files:**
- Modify: `packages/bot-core/src/marketing/index.ts:111-136`
- Test: `packages/bot-core/src/marketing/index.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `packages/bot-core/src/marketing/index.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const fromMock = vi.fn()
vi.mock('@portfolio/database', () => ({ supabase: { from: (...a: unknown[]) => fromMock(...a) } }))
vi.mock('../ai/index', () => ({ ask: vi.fn() }))
vi.mock('../admin-bot/notify', () => ({ notifyAdminBot: vi.fn() }))
const sendEmailMock = vi.fn()
vi.mock('../email/index', () => ({ sendEmail: (...a: unknown[]) => sendEmailMock(...a) }))

import { dispatchApproved } from './index'

describe('publishEmailCampaign via dispatchApproved', () => {
  beforeEach(() => { fromMock.mockReset(); sendEmailMock.mockReset() })

  it('throws an actionable error for trial/paid audience (no billing table yet)', async () => {
    await expect(
      dispatchApproved('email_welcome', {
        audience: 'trial', subject: 'S', html: '<p>x</p>',
      } as never),
    ).rejects.toThrow(/billing model not selected/i)
  })

  it('sends to all users resolved from user_identities email channel', async () => {
    fromMock.mockReturnValue({
      select: () => ({ eq: () => ({ limit: () => Promise.resolve({
        data: [{ channel_user_id: 'a@x.com' }, { channel_user_id: 'b@x.com' }],
      }) }) }),
    })
    await dispatchApproved('email_welcome', {
      audience: 'all', subject: 'Hi', html: '<p>hi</p>',
    } as never)
    expect(sendEmailMock).toHaveBeenCalledTimes(2)
    expect(sendEmailMock.mock.calls[0][0]).toMatchObject({ to: 'a@x.com', subject: 'Hi' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @portfolio/bot-core exec vitest run src/marketing/index.test.ts`
Expected: FAIL (current code queries `subscriptions`/`users`, error text differs / sends 0).

- [ ] **Step 3: Replace publishEmailCampaign**

In `packages/bot-core/src/marketing/index.ts`, replace the whole `publishEmailCampaign` function (lines 109-136) with:
```typescript
// ── publishEmailCampaign ──────────────────────────────────────────────────────
// Omnichannel: recipients come from user_identities (channel='email').
// audience 'trial'/'paid' depends on a billing table that does not exist until a
// product is selected (DECISIONS.md 2026-05-16) — fail loud with an actionable message.

async function publishEmailCampaign(payload: EmailPayload): Promise<void> {
  if (payload.audience === 'trial' || payload.audience === 'paid') {
    throw new Error(
      `audience='${payload.audience}' requires a billing model which is not selected yet ` +
      `(DECISIONS.md 2026-05-16). Use audience='all' or wait until the first product defines billing.`,
    )
  }

  const { data: identities } = await supabase
    .from('user_identities')
    .select('channel_user_id')
    .eq('channel', 'email')
    .limit(500)

  if (!identities?.length) return

  const from = process.env.MARKETING_FROM_EMAIL ?? 'noreply@portfolio.app'
  await Promise.allSettled(
    identities
      .map((i) => (i as { channel_user_id: string }).channel_user_id)
      .filter((e): e is string => typeof e === 'string' && e.includes('@'))
      .map((email) =>
        sendEmail({ to: email, subject: payload.subject, template: '__raw__', variables: { __html__: payload.html }, from }),
      ),
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @portfolio/bot-core exec vitest run src/marketing/index.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @portfolio/bot-core typecheck`
Expected: PASS. (`subscriptions`/`users` no longer referenced in marketing.)

- [ ] **Step 6: Commit + PR (code → PR per convention)**

```bash
git checkout -b fix/wave3-marketing-schema
git add packages/bot-core/src/marketing/index.ts packages/bot-core/src/marketing/index.test.ts
git commit -m "fix(marketing): omnichannel email recipients; drop dead subscriptions/users.telegram_id

publishEmailCampaign queried users.telegram_id (pre-omnichannel) and the
absent subscriptions table. Resolve audience='all' from user_identities
email channel; trial/paid throw an actionable error (billing deferred,
DECISIONS 2026-05-16). transport/payments subscription code untouched
(opt-in by design).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push -u origin fix/wave3-marketing-schema
"C:\Program Files\GitHub CLI\gh.exe" pr create --title "fix(marketing): omnichannel email; drop dead subscriptions ref" --body "Wave 3.2 (docs/ROADMAP.md). Aligns shared marketing flow to omnichannel schema. transport/payments subscription code untouched (opt-in by design, DECISIONS 2026-05-16)."
```
Then `gh pr checks <N> --watch`; merge on green; tick ROADMAP 3.2 in a follow-up docs commit to main.

---

## Task 4: 3.3 — Seed shared support/qa prompts

**Files:**
- Create: `packages/database/migrations/005_shared_agent_prompts.sql`

- [ ] **Step 1: Create the migration**

Create `packages/database/migrations/005_shared_agent_prompts.sql`:
```sql
-- Shared (project_id = NULL) prompts for support + qa subagents.
-- Mirrors 002_marketing_prompts.sql conventions. Projects override per-project
-- in projects/[name]/prompts.sql. Models per CLAUDE.md model strategy:
--   support:sentiment  -> gpt-4o-mini (classification)
--   qa:reply_judge     -> gpt-4o-mini (AI-as-judge, is_judge=true)

INSERT INTO prompts (name, content, model, provider, project_id, is_judge, rubric_schema) VALUES

('support:sentiment', $$
Classify the sentiment of the following user message.
Reply with ONLY a JSON object in this exact format:
{"sentiment":"positive"|"neutral"|"negative","score":0.0-1.0,"reason":"one short sentence"}

User message: {{message}}
$$, 'gpt-4o-mini', 'openai', NULL, false, NULL),

('qa:reply_judge', $$
You are a QA evaluator for a Telegram bot.
User message: "{{userMessage}}"
Bot reply: "{{botReply}}"
Evaluation criteria: {{criteria}}

Rate the reply on a scale of 0–10 and explain briefly.
Reply in JSON: { "score": number, "passed": boolean, "reasoning": string, "suggestions": string[] }
$$, 'gpt-4o-mini', 'openai', NULL, true,
 '{"score":"number","passed":"boolean","reasoning":"string","suggestions":"string[]"}'::jsonb)

ON CONFLICT (name, project_id) DO UPDATE
  SET content    = EXCLUDED.content,
      model      = EXCLUDED.model,
      provider   = EXCLUDED.provider,
      is_judge   = EXCLUDED.is_judge,
      rubric_schema = EXCLUDED.rubric_schema,
      updated_at = now();
```

- [ ] **Step 2: Verify SQL parses (no live DB needed)**

Run: `powershell -Command "Select-String -Path packages/database/migrations/005_shared_agent_prompts.sql -Pattern 'support:sentiment','qa:reply_judge'"`
Expected: both names found. (Live apply happens with the rest of migrations during 3.4 SaaS wiring / Supabase setup — Part B.)

- [ ] **Step 3: Commit (migration is code → PR; bundle with Task 5/6 below in one branch)**

Do not commit standalone — continue on the same branch as Tasks 5 & 6, single PR for 3.3.

---

## Task 5: 3.3 — Refactor support sentiment to ask()

**Files:**
- Modify: `packages/bot-core/src/support/sentiment.ts`
- Test: `packages/bot-core/src/support/sentiment.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `packages/bot-core/src/support/sentiment.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const askMock = vi.fn()
vi.mock('../ai/index', () => ({ ask: (...a: unknown[]) => askMock(...a) }))

import { analyzeSentiment } from './sentiment'

describe('analyzeSentiment', () => {
  beforeEach(() => askMock.mockReset())

  it('calls the named shared prompt support:sentiment with message var', async () => {
    askMock.mockResolvedValue('{"sentiment":"negative","score":0.9,"reason":"angry"}')
    const r = await analyzeSentiment('this is broken')
    expect(askMock).toHaveBeenCalledWith('support:sentiment', { message: 'this is broken' })
    expect(r).toEqual({ sentiment: 'negative', score: 0.9, reason: 'angry' })
  })

  it('falls back to neutral on parse failure', async () => {
    askMock.mockResolvedValue('not json')
    expect(await analyzeSentiment('x')).toEqual({ sentiment: 'neutral', score: 0.5, reason: 'parse error' })
  })

  it('falls back to neutral on ask() throw', async () => {
    askMock.mockRejectedValue(new Error('boom'))
    expect(await analyzeSentiment('x')).toEqual({ sentiment: 'neutral', score: 0.5, reason: 'analysis failed' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @portfolio/bot-core exec vitest run src/support/sentiment.test.ts`
Expected: FAIL (current code imports getProvider, never calls ask).

- [ ] **Step 3: Rewrite sentiment.ts**

Replace the entire contents of `packages/bot-core/src/support/sentiment.ts` with:
```typescript
import { ask } from '../ai/index'
import type { SentimentResult } from './types'

// Prompt lives in Supabase as shared row 'support:sentiment'
// (migrations/005_shared_agent_prompts.sql). Model: gpt-4o-mini.
export async function analyzeSentiment(message: string): Promise<SentimentResult> {
  try {
    const raw = await ask('support:sentiment', { message })

    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return { sentiment: 'neutral', score: 0.5, reason: 'parse error' }

    const parsed = JSON.parse(match[0]) as SentimentResult
    return {
      sentiment: parsed.sentiment ?? 'neutral',
      score: Number(parsed.score ?? 0.5),
      reason: parsed.reason ?? '',
    }
  } catch {
    return { sentiment: 'neutral', score: 0.5, reason: 'analysis failed' }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @portfolio/bot-core exec vitest run src/support/sentiment.test.ts`
Expected: PASS (3 tests).

---

## Task 6: 3.3 — Refactor qa judge to engine judge()

**Context:** `qa/judge.ts:21` calls `ask(prompt, { model })` passing the prompt *text* as the prompt *name* — `getPrompt` finds no row, sends empty content. Fix: use the engine `judge()` with the named `qa:reply_judge` prompt (is_judge=true). Import as `aiJudge` to avoid the name collision with this module's exported `judge`.

**Files:**
- Modify: `packages/bot-core/src/qa/judge.ts`
- Test: `packages/bot-core/src/qa/judge.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `packages/bot-core/src/qa/judge.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const judgeMock = vi.fn()
vi.mock('../ai', () => ({ judge: (...a: unknown[]) => judgeMock(...a) }))

import { judge } from './judge'

describe('qa judge', () => {
  beforeEach(() => judgeMock.mockReset())

  it('calls engine judge with named prompt qa:reply_judge and vars', async () => {
    judgeMock.mockResolvedValue({ score: 8, passed: true, reasoning: 'ok', suggestions: [] })
    const r = await judge('hi', 'hello there', 'tone')
    expect(judgeMock).toHaveBeenCalledWith('qa:reply_judge', {
      userMessage: 'hi', botReply: 'hello there', criteria: 'tone',
    })
    expect(r).toEqual({ score: 8, passed: true, reasoning: 'ok', suggestions: [] })
  })

  it('returns a failed result when engine judge throws', async () => {
    judgeMock.mockRejectedValue(new Error('boom'))
    expect(await judge('a', 'b', 'c')).toEqual({
      score: 0, passed: false, reasoning: 'judge error', suggestions: [],
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @portfolio/bot-core exec vitest run src/qa/judge.test.ts`
Expected: FAIL (current code calls `ask`, not engine `judge`).

- [ ] **Step 3: Rewrite qa/judge.ts**

Replace the entire contents of `packages/bot-core/src/qa/judge.ts` with:
```typescript
import { judge as aiJudge } from '../ai'
import type { JudgeResult } from './types'

// Evaluates bot reply quality. Prompt lives in Supabase as shared judge row
// 'qa:reply_judge' (is_judge=true, migrations/005_shared_agent_prompts.sql).
// Model gpt-4o-mini per CLAUDE.md (AI-as-judge != generator).
export async function judge(
  userMessage: string,
  botReply: string,
  criteria: string,
): Promise<JudgeResult> {
  try {
    return await aiJudge<JudgeResult>('qa:reply_judge', {
      userMessage,
      botReply,
      criteria,
    })
  } catch {
    return { score: 0, passed: false, reasoning: 'judge error', suggestions: [] }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @portfolio/bot-core exec vitest run src/qa/judge.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Full package test + typecheck**

Run: `pnpm --filter @portfolio/bot-core exec vitest run`
Expected: PASS (existing costs.test.ts + new marketing/sentiment/judge tests).

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit + PR for 3.3 (migration + support + qa, one branch)**

```bash
git checkout -b fix/wave3-prompt-table-compliance
git add packages/database/migrations/005_shared_agent_prompts.sql packages/bot-core/src/support/sentiment.ts packages/bot-core/src/support/sentiment.test.ts packages/bot-core/src/qa/judge.ts packages/bot-core/src/qa/judge.test.ts
git commit -m "fix(support,qa): route AI via ask()/judge() with shared DB prompts

support/sentiment hardcoded the prompt + called the provider directly;
qa/judge passed prompt text as the prompt name (sent empty content).
Both now use named shared prompts (migration 005, project_id=NULL),
restoring the CLAUDE.md 'prompts in Supabase, all AI via ask()/judge()'
principle.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push -u origin fix/wave3-prompt-table-compliance
"C:\Program Files\GitHub CLI\gh.exe" pr create --title "fix(support,qa): shared DB prompts via ask()/judge()" --body "Wave 3.3 (docs/ROADMAP.md). Removes hardcoded/misused prompts; seeds shared support:sentiment + qa:reply_judge."
```
Then `gh pr checks <N> --watch`; merge on green; tick ROADMAP 3.3 in a docs commit to main.

---

## Part A done criteria

- `projects/food-agent/` gone; `pnpm install` + `pnpm typecheck` green.
- No `subscriptions` / `users.telegram_id` references in `marketing/`.
- `support/sentiment` + `qa/judge` go through `ask()`/`judge()` with shared DB prompt rows; migration 005 present.
- vitest: costs + marketing + sentiment + judge tests pass.
- ROADMAP.md 3.1/3.2/3.3 ticked with evidence commits.

**Then:** write Wave 3 Part B plan (3.4 SaaS wiring ⚠️ founder portal steps → 3.5 smoke harness → 3.6 broader unit tests).
