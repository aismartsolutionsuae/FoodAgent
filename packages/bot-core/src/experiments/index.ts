import { PostHog } from 'posthog-node'

let client: PostHog | null = null

function getClient(): PostHog {
  if (!client) {
    const key = process.env.POSTHOG_API_KEY
    if (!key) throw new Error('POSTHOG_API_KEY is not set')
    client = new PostHog(key, {
      host: process.env.POSTHOG_HOST ?? 'https://eu.i.posthog.com',
      flushAt: 10,
      flushInterval: 10_000,
    })
  }
  return client
}

// ── getFlag ───────────────────────────────────────────────────────────────────
// Returns the feature flag value for a user (boolean or string variant).
// Falls back to `defaultValue` if PostHog is unreachable or flag is undefined.

export async function getFlag(
  flagKey: string,
  userId: string,
  defaultValue: string | boolean = false,
): Promise<string | boolean> {
  try {
    const ph = getClient()
    const value = await ph.getFeatureFlag(flagKey, userId)
    if (value === undefined || value === null) return defaultValue
    return value
  } catch {
    return defaultValue
  }
}

// ── isEnabled ─────────────────────────────────────────────────────────────────
// Convenience boolean check (for simple on/off flags).

export async function isEnabled(flagKey: string, userId: string): Promise<boolean> {
  const value = await getFlag(flagKey, userId, false)
  return value === true || value === 'true' || value === 'enabled'
}

// ── trackExperimentEvent ──────────────────────────────────────────────────────
// Captures an experiment conversion event, automatically tagging the active flag variant.

export async function trackExperimentEvent(
  flagKey: string,
  userId: string,
  eventName: string,
  properties: Record<string, unknown> = {},
): Promise<void> {
  try {
    const ph = getClient()
    const variant = await ph.getFeatureFlag(flagKey, userId)
    ph.capture({
      distinctId: userId,
      event: eventName,
      properties: {
        ...properties,
        [`$feature/${flagKey}`]: variant,
        experiment: flagKey,
        variant,
      },
    })
    void ph.flush()
  } catch {
    // never block on analytics
  }
}
