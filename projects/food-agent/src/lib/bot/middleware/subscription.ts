import type { NextFunction } from 'grammy'
import type { BotContext } from '../context'
import { supabase } from '@/lib/supabase/client'
import { InlineKeyboard } from 'grammy'
import { i18n } from '../i18n'

// Blocks access if the user's trial has expired and they haven't subscribed.
// Must run AFTER userMiddleware.
// Onboarding steps are allowed through so new users can complete registration.
export async function subscriptionMiddleware(ctx: BotContext, next: NextFunction) {
  const user = ctx.dbUser
  const sub = ctx.dbSub

  // Unknown user — /start will handle registration
  if (!user || !sub) return next()

  // Let users finish onboarding without a subscription check
  if (user.onboarding_step !== 'complete') return next()

  const now = new Date()

  if (sub.status === 'active' && sub.current_period_end && new Date(sub.current_period_end) > now) {
    return next()
  }

  if (sub.status === 'trial' && new Date(sub.trial_expires_at) > now) {
    return next()
  }

  // Trial expired or subscription lapsed — update status and prompt payment
  if (sub.status === 'trial') {
    await supabase
      .from('subscriptions')
      .update({ status: 'expired' })
      .eq('id', sub.id)
  }

  const s = i18n(user.language)
  const checkoutUrl = buildCheckoutUrl(user.telegram_id)

  const keyboard = new InlineKeyboard().url(s.subscribe_btn, checkoutUrl)

  await ctx.reply(s.trial_expired_msg, { reply_markup: keyboard })
}

function buildCheckoutUrl(telegramId: number): string {
  const base = process.env.LEMONSQUEEZY_CHECKOUT_URL ?? '#'
  return `${base}?checkout[custom][telegram_id]=${telegramId}`
}
