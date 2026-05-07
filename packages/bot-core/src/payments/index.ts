import crypto from 'crypto'
import { supabase } from '@portfolio/database'

// ── Lemon Squeezy ─────────────────────────────────────────────────────────────

export function getCheckoutUrl(telegramId: number, checkoutBaseUrl?: string): string {
  const base = checkoutBaseUrl ?? process.env.LEMONSQUEEZY_CHECKOUT_URL ?? '#'
  return `${base}?checkout[custom][telegram_id]=${telegramId}`
}

export function handleLSWebhook(
  payload: string,
  signature: string,
): { event: string; data: Record<string, unknown> } | null {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET ?? ''
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null
  }

  return JSON.parse(payload) as { event: string; data: Record<string, unknown> }
}

// ── Stripe ────────────────────────────────────────────────────────────────────

export async function getStripeCheckoutUrl(
  userId: string,
  priceId?: string,
): Promise<string> {
  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2025-02-24.acacia' })

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId ?? process.env.STRIPE_PRICE_ID ?? '', quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/cancel`,
    metadata: { user_id: userId },
  })

  return session.url ?? '#'
}

export async function handleStripeWebhook(
  payload: string,
  signature: string,
): Promise<{ type: string; data: Record<string, unknown> } | null> {
  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2025-02-24.acacia' })

  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET ?? '',
    )
    return { type: event.type, data: event.data as unknown as Record<string, unknown> }
  } catch {
    return null
  }
}

// ── Trial management ──────────────────────────────────────────────────────────

export async function extendTrial(userId: string, days: number): Promise<void> {
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('trial_expires_at')
    .eq('user_id', userId)
    .single()

  if (!sub) return

  const current = new Date(sub.trial_expires_at)
  const extended = new Date(Math.max(current.getTime(), Date.now()) + days * 86_400_000)

  await supabase
    .from('subscriptions')
    .update({ trial_expires_at: extended.toISOString(), status: 'trial' })
    .eq('user_id', userId)
}
