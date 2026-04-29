import type { NextFunction } from 'grammy'
import type { BotContext } from '../context'
import { supabase } from '@/lib/supabase/client'

// Loads dbUser and dbSub from Supabase and attaches them to ctx.
// Runs before every handler so all code downstream has access.
export async function userMiddleware(ctx: BotContext, next: NextFunction) {
  ctx.dbUser = null
  ctx.dbSub = null

  const telegramId = ctx.from?.id
  if (!telegramId) return next()

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegramId)
    .single()

  if (user) {
    ctx.dbUser = user

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    ctx.dbSub = sub
  }

  return next()
}
