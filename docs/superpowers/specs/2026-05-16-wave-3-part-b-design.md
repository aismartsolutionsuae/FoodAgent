# Wave 3 Part B — Design (3.5 Smoke harness + 3.6 Tests)

> Status: approved scope, pre-implementation spec.
> Date: 2026-05-16. Author: Claude Code (tech lead) + founder (orchestrator).
> Source of truth for "where are we": `docs/ROADMAP.md`. This spec details Part B only.

## Scope

**Wave 3 Part B = sub-stages 3.5 + 3.6.** Sub-stage 3.4 (SaaS wiring) is explicitly
**out of Part B** — it is blocked on founder portal/key steps and is sequenced as a
later, incremental Part C (one service at a time, each flipping its own smoke check
from honest-skip → real). Part B has zero external dependencies and is fully
unblocked now.

**Order inside Part B: 3.5 → 3.6.** Smoke harness first (fast "does it breathe"
signal), then unit tests (deep logic). Each sub-stage is its own PR (code → PR per
the git convention; this spec doc commits direct to `main`).

## Rationale (recorded)

- **Unblock-first** (industry standard, monorepo CI practice): work that does not
  wait on external steps is done before work that does. 3.4 needs founder action in
  Langfuse/PostHog/BetterStack/Resend/Telegram portals; gating the whole wave on
  that is an anti-pattern.
- **Consistent with the ROADMAP done-criterion**: "5 layers each reach their
  dependency *or honestly stubbed with a recorded reason*". The smoke harness is
  therefore designed dual-state from the start, so 3.4 requires **no harness
  rework** — each service just switches its own check stub→real when its key lands.

## 3.5 Smoke harness

### Goal

One runnable script, one check per shared layer, answering "is each layer wired
and alive, or honestly stubbed with a recorded reason?". Runnable locally and in
CI. Non-failing on absent optional SaaS keys (that is the expected pre-3.4 state).

### Dual-state contract (the crux)

Every layer check returns one of three outcomes:

| Outcome | Meaning | Process exit |
|---|---|---|
| `ok` | dependency reached via a real call | success |
| `skip` | required key absent → honest skip with a recorded reason string | success (not a failure) |
| `fail` | key present but the call errored, or logic broke | failure (non-zero) |

`skip` is a first-class success outcome pre-3.4. The harness prints a summary table
(layer · outcome · reason) and exits non-zero **only** if any check is `fail`.
A key becoming present later flips that layer `skip → ok` with no code change.

### Per-layer checks

| Layer | Check | Pre-3.4 state | Key gate |
|---|---|---|---|
| AI engine | `ask()` with a trivial fixed prompt, assert non-empty text | `ok` (OpenAI key present) | `OPENAI_API_KEY` |
| Support | triage on a fixture message, assert a category is returned | `ok` (routes via OpenAI) | `OPENAI_API_KEY` |
| Experiments | `getFlag()` for a probe flag, assert a boolean/variant | `skip` (no PostHog key) | `POSTHOG_*` |
| QA | `judge()` on a fixture (answer, rubric), assert a verdict | `ok` (routes via OpenAI) | `OPENAI_API_KEY` |
| Marketing | content-gen **dry-run** (generate, do NOT publish), assert draft produced; Resend send path is `skip` if no key | `ok` for gen logic; Resend `skip` | `OPENAI_API_KEY` (gen); `RESEND_API_KEY` (send path) |

Notes:
- AI/Support/QA/Marketing-gen reach OpenAI by the model strategy (DECISIONS
  2026-05-11) — these are `ok` now because `OPENAI_API_KEY` is already provisioned.
- Smoke AI calls use the cheapest viable tier and the shortest possible prompt to
  keep cost negligible; they are not run in a tight loop.
- Langfuse is not its own row — it is an observability sidecar on the AI engine
  call; its absence is silent-degrade by existing engine design, surfaced in the
  AI engine check's reason string when `LANGFUSE_*` is absent.

### Layer-4 autonomous coder — separate, manual, NOT in per-CI smoke

The Layer-4 autonomous coder (`claude-code-action`, Anthropic-backed) is verified
by a **one-shot `workflow_dispatch`** smoke, NOT a per-commit CI check:

- A manually triggered workflow posts a stub `@claude` instruction on a throwaway
  issue; success = a no-op PR is opened by the action.
- Run once, record evidence (PR link + date) in `docs/ROADMAP.md` 3.5 line, then
  do not re-run on every commit.
- Reason: per-commit autonomous PRs would spam PRs and burn Anthropic tokens +
  Actions minutes — violates the cost-discipline posture (DECISIONS 2026-05-16
  branch-protection / cost lines). This is the only Anthropic-backed axis in the
  smoke; it is intentionally decoupled from the OpenAI product-engine checks.

### Done (3.5)

Harness script merged; CI runs it green (all `ok` or honest `skip`, zero `fail`);
summary table emitted; Layer-4 one-shot dispatch run once with evidence recorded
in ROADMAP; 3.5 checkbox + Evidence updated in the same PR.

## 3.6 Tests

### Goal

Unit tests for each layer's **pure logic** (no live network) + the `resolveUser`
race. Closes the "only `ai/costs.test.ts` exists" gap from the Wave 3 audit.

### Test convention (mandatory — CLAUDE.md vitest 3.2.4 footgun)

For any async function with `try/catch`, do **not** test the error branch via a
shared module-level `vi.fn()` with `mockRejectedValue` + `beforeEach(mockReset)`
(tinyspy surfaces the thrown error as unhandled and fails the test even though
prod code catches it). Use the **injected-impl pattern**: `let impl; vi.mock(mod,
() => ({ fn: (...a) => impl(...a) }))` — happy-path = fresh `vi.fn()` (asserts
args), error-path = a plain throwing function (not a spy). Reference:
`src/support/sentiment.test.ts`, `src/qa/judge.test.ts`.

### Coverage targets (pure logic per layer)

Tests cover **only logic that exists in the code today**. The AI resilience
retry/fallback/degradation design (DECISIONS 2026-05-15) is **decided but not yet
implemented** in `ai/router.ts` / `ai/index.ts` (verified 2026-05-16). It is
explicitly **out of Part B scope** and tracked as a separate item (its own
implement+test sub-stage/wave, decided with the founder) — not smuggled into a
"tests" stage. 3.6 does not test non-existent code.

| Unit | What is tested (pure, no live network) — exists today |
|---|---|
| AI engine | `getPrompt` shared↔project fallback (project row preferred, NULL row fallback); `ask()` `{{var}}` substitution; `judge()` JSON extraction from fenced/raw output incl. malformed→raw passthrough. Cost calc already covered by `costs.test.ts` (no new work). |
| Support | `analyzeSentiment` parse + fallbacks already covered by `sentiment.test.ts` (no new work). Gap: none additional for Part B (middleware is grammy-bound, not pure). |
| Experiments | `getFlag` resolution: returns flag value when present; returns `defaultValue` when undefined/null; returns `defaultValue` on client throw. `isEnabled` truthy mapping. |
| QA | `judge()` wrapper already covered by `judge.test.ts` (no new work). |
| Marketing | audience trial/paid throws actionable error + all→email-channel send already covered by `index.test.ts` (no new work). |
| Identity | `resolveUser` race: SELECT-miss → INSERT user+identity → on UNIQUE violation delete orphan user and re-resolve to the winner (DECISIONS 2026-05-16). |

Net new test files for 3.6: **experiments** + **identity** + **ai engine**
(`getPrompt`/`ask`/`judge` pure parts). Support/QA/Marketing/costs are already
covered — Part B does not duplicate them.

External calls (OpenAI, Supabase, PostHog) are mocked via the injected-impl
pattern — these are unit tests, not the smoke harness's live checks.

### Done (3.6)

Per-layer pure-logic unit tests + `resolveUser` race test merged; full bot-core
suite green in CI; 3.6 checkbox + Evidence updated in the same PR.

## Wave 3 status after Part B

3.1–3.3 done · **3.5, 3.6 done (this Part B)** · 3.4 remains (Part C, incremental,
founder-key-gated). Wave 3 fully closes when 3.4's services flip their smoke
checks `skip → ok` and the ROADMAP done-criterion holds.
