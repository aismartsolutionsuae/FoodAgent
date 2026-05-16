import { describe, it, expect, afterAll } from 'vitest'

// ── Dual-state contract ───────────────────────────────────────────────────────
// ok   = required env present → real call succeeded (assertion passed)
// skip = required env absent  → it.skipIf, non-failing, reason recorded below
// fail = env present but call errored / assertion failed → vitest non-zero exit
//
// A key landing later (Wave 3.4) flips skip→ok with NO code change here.
//
// Layer modules are imported LAZILY inside each (already-gated) test. The shared
// DB client (@portfolio/database) calls createClient() at module load and throws
// on an empty SUPABASE_URL, so a static import would crash the whole file before
// any skipIf runs. Lazy import = no env → no import → honest skip, never crash.

const has = (...keys: string[]) => keys.every((k) => !!process.env[k])

const OPENAI = has('OPENAI_API_KEY')
const DB = has('SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY')
const OPENAI_DB = OPENAI && DB
const POSTHOG = has('POSTHOG_API_KEY')
const RESEND = has('RESEND_API_KEY')

const summary: Array<[string, 'ok' | 'skip', string]> = []
const mark = (layer: string, gate: boolean, reason: string) =>
  summary.push([layer, gate ? 'ok' : 'skip', gate ? 'real call' : reason])

describe('Wave 3 smoke harness (dual-state)', () => {
  it.skipIf(!OPENAI)('AI engine — OpenAI provider reachable', async () => {
    mark('ai-engine', OPENAI, 'OPENAI_API_KEY absent')
    const { getProvider } = await import('../src/ai/router')
    const out = await getProvider('openai').complete(
      [{ role: 'user', content: 'Reply with the single word OK.' }],
      'gpt-4o-mini',
      0,
    )
    expect(out.trim().length).toBeGreaterThan(0)
  })

  it.skipIf(!OPENAI_DB)('Support — sentiment triage on a fixture', async () => {
    mark('support', OPENAI_DB, 'OPENAI_API_KEY or SUPABASE_* absent')
    const { analyzeSentiment } = await import('../src/support/sentiment')
    const r = await analyzeSentiment('this product is completely broken and I am furious')
    expect(['positive', 'neutral', 'negative']).toContain(r.sentiment)
  })

  it.skipIf(!OPENAI_DB)('QA — judge returns a numeric verdict', async () => {
    mark('qa', OPENAI_DB, 'OPENAI_API_KEY or SUPABASE_* absent')
    const { judge } = await import('../src/qa/judge')
    const r = await judge('hello', 'Hi there, how can I help?', 'politeness')
    expect(typeof r.score).toBe('number')
  })

  it.skipIf(!OPENAI_DB)('Marketing — content gen dry-run (no publish)', async () => {
    mark('marketing', OPENAI_DB, 'OPENAI_API_KEY or SUPABASE_* absent')
    // generateContent wraps ask(); any seeded shared prompt proves the gen path.
    // 'support:sentiment' is seeded in migration 005 (project_id=NULL). This is a
    // DRY-RUN: no publishSocialPost / publishEmailCampaign is called.
    const { generateContent } = await import('../src/marketing')
    const draft = await generateContent({ promptName: 'support:sentiment', variables: { message: 'ping' } })
    expect(typeof draft).toBe('string')
  })

  it.skipIf(!POSTHOG)('Experiments — getFlag reachable', async () => {
    mark('experiments', POSTHOG, 'POSTHOG_API_KEY absent (Wave 3.4)')
    const { getFlag } = await import('../src/experiments')
    const v = await getFlag('smoke-probe-flag', 'smoke-user', false)
    expect(['boolean', 'string']).toContain(typeof v)
  })

  it.skipIf(RESEND)('Marketing email send-path — honest skip until RESEND_API_KEY', () => {
    // Inverse skipIf: when RESEND is ABSENT this test runs and records the skip
    // reason; when RESEND is present it is skipped (real send-path is exercised
    // by the marketing publish flow, out of smoke scope).
    mark('marketing-email', false, 'RESEND_API_KEY absent (Wave 3.4)')
    expect(true).toBe(true)
  })
})

afterAll(() => {
  // Layer-4 autonomous coder is verified by a separate one-shot workflow
  // (.github/workflows/layer4-smoke.yml), NOT per-run — see Task 3.
  summary.push([
    'layer4-coder',
    process.env.ANTHROPIC_API_KEY ? 'ok' : 'skip',
    process.env.ANTHROPIC_API_KEY ? 'via layer4-smoke.yml (manual)' : 'ANTHROPIC_API_KEY not provisioned',
  ])
  // eslint-disable-next-line no-console
  console.log(
    '\n── Wave 3 smoke summary ──\n' +
      summary.map(([l, o, r]) => `  ${l.padEnd(16)} ${o.padEnd(4)} ${r}`).join('\n') +
      '\n',
  )
})
