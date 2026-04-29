import { supabase } from '@/lib/supabase/client'
import crypto from 'node:crypto'

// Lemon Squeezy sends a POST request to this URL when subscription events occur.
// Events we care about: subscription_created, subscription_updated, subscription_cancelled
export async function POST(req: Request) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-signature')

  if (!verifySignature(rawBody, signature)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const event = JSON.parse(rawBody)
  const eventName: string = event.meta?.event_name ?? ''
  const data = event.data?.attributes ?? {}
  const customData = event.meta?.custom_data ?? {}

  const telegramId: number | undefined = customData.telegram_id
    ? Number(customData.telegram_id)
    : undefined

  if (!telegramId) {
    return new Response('Missing telegram_id in custom data', { status: 400 })
  }

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_id', telegramId)
    .single()

  if (!user) {
    return new Response('User not found', { status: 404 })
  }

  if (eventName === 'subscription_created' || eventName === 'subscription_updated') {
    const isActive = data.status === 'active'

    await supabase
      .from('subscriptions')
      .update({
        status: isActive ? 'active' : data.status,
        ls_subscription_id: String(event.data?.id ?? ''),
        ls_customer_id: String(data.customer_id ?? ''),
        current_period_end: data.renews_at ?? null,
      })
      .eq('user_id', user.id)
  }

  if (eventName === 'subscription_cancelled') {
    await supabase
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('user_id', user.id)
  }

  return new Response('OK', { status: 200 })
}

function verifySignature(body: string, signature: string | null): boolean {
  if (!signature || !process.env.LEMONSQUEEZY_WEBHOOK_SECRET) return false
  const hash = crypto
    .createHmac('sha256', process.env.LEMONSQUEEZY_WEBHOOK_SECRET)
    .update(body)
    .digest('hex')
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature))
}
