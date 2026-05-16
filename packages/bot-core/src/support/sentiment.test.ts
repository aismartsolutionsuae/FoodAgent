import { describe, it, expect, vi } from 'vitest'

// NOTE: implementation is injected per-test via `askImpl`. The happy path uses a
// fresh vi.fn() spy (call-arg assertions); the failure path uses a plain throwing
// function. A shared module-level throwing spy trips a vitest 3.2.4 defect where a
// thrown error from the spy surfaces as an unhandled test error even though
// production code catches it — this structure is the documented workaround.
let askImpl: (...a: unknown[]) => unknown
vi.mock('../ai/index', () => ({ ask: (...a: unknown[]) => askImpl(...a) }))

import { analyzeSentiment } from './sentiment'

describe('analyzeSentiment', () => {
  it('calls the named shared prompt support:sentiment with message var', async () => {
    const spy = vi.fn().mockResolvedValue('{"sentiment":"negative","score":0.9,"reason":"angry"}')
    askImpl = spy
    const r = await analyzeSentiment('this is broken')
    expect(spy).toHaveBeenCalledWith('support:sentiment', { message: 'this is broken' })
    expect(r).toEqual({ sentiment: 'negative', score: 0.9, reason: 'angry' })
  })

  it('falls back to neutral on parse failure', async () => {
    askImpl = vi.fn().mockResolvedValue('not json')
    expect(await analyzeSentiment('x')).toEqual({ sentiment: 'neutral', score: 0.5, reason: 'parse error' })
  })

  it('falls back to neutral on ask() throw', async () => {
    askImpl = () => { throw new Error('boom') }
    expect(await analyzeSentiment('x')).toEqual({ sentiment: 'neutral', score: 0.5, reason: 'analysis failed' })
  })
})
