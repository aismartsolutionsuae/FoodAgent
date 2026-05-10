import { describe, it, expect } from 'vitest'
import { estimateCostUsd } from './costs'

describe('estimateCostUsd', () => {
  it('returns 0 for empty strings', () => {
    expect(estimateCostUsd('gpt-4o-mini', '', '')).toBe(0)
  })

  it('charges more for gpt-4o than gpt-4o-mini on same text', () => {
    const text = 'Hello world this is a test message for cost comparison'
    const cheap = estimateCostUsd('gpt-4o-mini', text, text)
    const expensive = estimateCostUsd('gpt-4o', text, text)
    expect(expensive).toBeGreaterThan(cheap)
  })

  it('does not throw for unknown model (uses default cost)', () => {
    expect(() => estimateCostUsd('unknown-model-xyz', 'test', 'test')).not.toThrow()
  })

  it('output is more expensive than input per token for gpt-4o', () => {
    const sameText = 'a'.repeat(400) // ~100 tokens
    const inputOnly = estimateCostUsd('gpt-4o', sameText, '')
    const outputOnly = estimateCostUsd('gpt-4o', '', sameText)
    expect(outputOnly).toBeGreaterThan(inputOnly)
  })

  it('cost scales linearly with text length', () => {
    const short = estimateCostUsd('gpt-4o-mini', 'aaaa', '')   // ~1 token
    const long = estimateCostUsd('gpt-4o-mini', 'a'.repeat(400), '') // ~100 tokens
    expect(long).toBeCloseTo(short * 100, 10)
  })

  it('claude models are priced correctly (haiku cheaper than sonnet)', () => {
    const text = 'a'.repeat(1000)
    const haiku = estimateCostUsd('claude-haiku-4-5', text, text)
    const sonnet = estimateCostUsd('claude-sonnet-4-6', text, text)
    expect(sonnet).toBeGreaterThan(haiku)
  })
})
