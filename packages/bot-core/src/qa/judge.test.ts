import { describe, it, expect, vi } from 'vitest'

// Implementation injected per-test via `judgeImpl` (see sentiment.test.ts note):
// happy path = fresh vi.fn() spy for call-arg assertions; error path = plain
// throwing function, to dodge a vitest 3.2.4 shared-throwing-spy defect.
let judgeImpl: (...a: unknown[]) => unknown
vi.mock('../ai', () => ({ judge: (...a: unknown[]) => judgeImpl(...a) }))

import { judge } from './judge'

describe('qa judge', () => {
  it('calls engine judge with named prompt qa:reply_judge and vars', async () => {
    const spy = vi.fn().mockResolvedValue({ score: 8, passed: true, reasoning: 'ok', suggestions: [] })
    judgeImpl = spy
    const r = await judge('hi', 'hello there', 'tone')
    expect(spy).toHaveBeenCalledWith('qa:reply_judge', {
      userMessage: 'hi', botReply: 'hello there', criteria: 'tone',
    })
    expect(r).toEqual({ score: 8, passed: true, reasoning: 'ok', suggestions: [] })
  })

  it('returns a failed result when engine judge throws', async () => {
    judgeImpl = () => { throw new Error('boom') }
    expect(await judge('a', 'b', 'c')).toEqual({
      score: 0, passed: false, reasoning: 'judge error', suggestions: [],
    })
  })
})
