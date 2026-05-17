import { describe, it, expect, vi, beforeEach } from 'vitest'

// Supabase fluent mock: getPrompt builds a query on 'prompts' ending in
// .order().limit().single(); logAiCost does .from('portfolio_events').insert().
let promptRow: Record<string, unknown> | null
const fromMock = vi.fn((table: string) => {
  if (table === 'prompts') {
    const q: Record<string, unknown> = {}
    const ret = () => q
    q.select = ret; q.eq = ret; q.or = ret; q.is = ret; q.order = ret; q.limit = ret
    q.single = () => Promise.resolve({ data: promptRow })
    return q
  }
  return { insert: () => Promise.resolve({}) }
})
vi.mock('@portfolio/database', () => ({ supabase: { from: (...a: unknown[]) => fromMock(...(a as [string])) } }))

// Provider mock: complete echoes the user content so substitution is observable;
// judge tests override completeImpl per-test.
let completeImpl: (...a: unknown[]) => Promise<string>
vi.mock('./router', () => ({
  getProvider: () => ({
    complete: (...a: unknown[]) => completeImpl(...a),
    // eslint-disable-next-line @typescript-eslint/no-empty-function, require-yield
    stream: async function* () {},
  }),
}))

import { getPrompt, ask, judge } from './index'

beforeEach(() => {
  fromMock.mockClear()
  promptRow = null
  completeImpl = vi.fn(async (...a: unknown[]) => (a[0] as { content: string }[])[0].content)
  delete process.env.LANGFUSE_SECRET_KEY
  delete process.env.LANGFUSE_PUBLIC_KEY
})

describe('getPrompt', () => {
  it('maps a found row to content/model/provider/isJudge', async () => {
    promptRow = { content: 'hi', model: 'gpt-5.4', provider: 'openai', is_judge: true, rubric_schema: { a: 1 } }
    const r = await getPrompt('p-map-unique')
    expect(r).toEqual({ content: 'hi', model: 'gpt-5.4', provider: 'openai', isJudge: true, rubricSchema: { a: 1 } })
  })

  it('falls back to safe defaults when no row found', async () => {
    promptRow = null
    const r = await getPrompt('p-default-unique')
    expect(r).toEqual({ content: '', model: 'gpt-4o', provider: 'openai', isJudge: false, rubricSchema: null })
  })

  it('serves the 10-min cache on a second call (no second DB hit)', async () => {
    promptRow = { content: 'cached', model: 'gpt-4o', provider: 'openai', is_judge: false, rubric_schema: null }
    await getPrompt('p-cache-unique')
    const callsAfterFirst = fromMock.mock.calls.length
    await getPrompt('p-cache-unique')
    expect(fromMock.mock.calls.length).toBe(callsAfterFirst) // no extra .from('prompts')
  })
})

describe('ask', () => {
  it('substitutes every {{var}} occurrence before sending', async () => {
    promptRow = { content: 'Hello {{name}}, bye {{name}}', model: 'gpt-4o', provider: 'openai', is_judge: false, rubric_schema: null }
    const out = await ask('p-ask-unique', { name: 'World' })
    expect(out).toBe('Hello World, bye World')
  })
})

describe('judge', () => {
  it('extracts JSON from a fenced code block', async () => {
    promptRow = { content: 'judge {{x}}', model: 'gpt-4o-mini', provider: 'openai', is_judge: true, rubric_schema: null }
    completeImpl = vi.fn(async () => '```json\n{"score":7,"passed":true}\n```')
    const r = await judge<{ score: number; passed: boolean }>('p-judge-json-unique', { x: 'a' })
    expect(r).toEqual({ score: 7, passed: true })
  })

  it('passes raw output through when it is not valid JSON', async () => {
    promptRow = { content: 'judge', model: 'gpt-4o-mini', provider: 'openai', is_judge: true, rubric_schema: null }
    completeImpl = vi.fn(async () => 'not json at all')
    const r = await judge<string>('p-judge-raw-unique', {})
    expect(r).toBe('not json at all')
  })
})
