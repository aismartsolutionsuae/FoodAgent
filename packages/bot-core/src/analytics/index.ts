import { PostHog } from 'posthog-node'
import { supabase } from '@portfolio/database'

let _posthog: PostHog | null = null

function getPostHog(): PostHog | null {
  if (!process.env.POSTHOG_API_KEY) return null
  if (!_posthog) {
    _posthog = new PostHog(process.env.POSTHOG_API_KEY, {
      host: 'https://eu.i.posthog.com',
      flushAt: 20,
      flushInterval: 10_000,
    })
  }
  return _posthog
}

// track(event, properties, userId?)
// → PostHog + portfolio_events in Supabase
//
// Mandatory events (tracked automatically by bot-core middleware):
//   bot:start, subscription:trial_start, subscription:activated,
//   subscription:expired, error:unhandled
//
// Projects add only business events:
//   track('order:created', { item, price }, userId)

export async function track(
  event: string,
  properties: Record<string, unknown> = {},
  userId?: string,
): Promise<void> {
  const ph = getPostHog()
  if (ph) {
    ph.capture({
      distinctId: userId ?? 'anonymous',
      event,
      properties,
    })
  }

  // Fire-and-forget; never throw
  void supabase.from('portfolio_events').insert({
    user_id: userId ?? null,
    event_name: event,
    properties,
  })
}
