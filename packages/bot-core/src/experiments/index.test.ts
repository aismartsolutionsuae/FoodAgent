import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'

let flagValue: unknown
let throwOnFlag = false
vi.mock('posthog-node', () => ({
  PostHog: vi.fn().mockImplementation(() => ({
    getFeatureFlag: () => (throwOnFlag ? Promise.reject(new Error('posthog down')) : Promise.resolve(flagValue)),
    capture: vi.fn(),
    flush: () => Promise.resolve(),
  })),
}))

import { getFlag, isEnabled } from './index'

beforeAll(() => {
  // getClient() throws without a key; set one so we exercise getFeatureFlag,
  // not the no-key catch path.
  process.env.POSTHOG_API_KEY = 'phc_test'
})

beforeEach(() => {
  flagValue = undefined
  throwOnFlag = false
})

describe('getFlag', () => {
  it('returns the flag value when PostHog returns one', async () => {
    flagValue = 'variant-b'
    expect(await getFlag('exp', 'user-1', false)).toBe('variant-b')
  })

  it('returns defaultValue when the flag is undefined', async () => {
    flagValue = undefined
    expect(await getFlag('exp', 'user-1', 'control')).toBe('control')
  })

  it('returns defaultValue when PostHog throws', async () => {
    throwOnFlag = true
    expect(await getFlag('exp', 'user-1', false)).toBe(false)
  })
})

describe('isEnabled', () => {
  it('is true for boolean true and the strings "true"/"enabled"', async () => {
    flagValue = true
    expect(await isEnabled('exp', 'u')).toBe(true)
    flagValue = 'enabled'
    expect(await isEnabled('exp', 'u')).toBe(true)
  })

  it('is false when the flag is absent', async () => {
    flagValue = undefined
    expect(await isEnabled('exp', 'u')).toBe(false)
  })
})
