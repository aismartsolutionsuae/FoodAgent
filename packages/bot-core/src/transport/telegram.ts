import { Bot, Context, NextFunction, session, type SessionFlavor } from 'grammy'
import { conversations, type ConversationFlavor } from '@grammyjs/conversations'
import { limit } from '@grammyjs/ratelimiter'
import { supabase, type DbUser, type DbSubscription } from '@portfolio/database'
import { type SessionData, createSupabaseSessionStorage } from '../session/index.js'

// ── Context ────────────────────────────────────────────────────────────────────

// Build context type step by step to avoid circular references.
type _BaseCtx = Context & SessionFlavor<SessionData>

export type BotContext = ConversationFlavor<_BaseCtx> & {
  dbUser: DbUser | null
  dbSub: DbSubscription | null
}

// ── User middleware ────────────────────────────────────────────────────────────

export async function userMiddleware(ctx: BotContext, next: NextFunction): Promise<void> {
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
    ctx.dbUser = user as DbUser

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    ctx.dbSub = sub as DbSubscription | null
  }

  return next()
}

// ── Subscription middleware ────────────────────────────────────────────────────

export function createSubscriptionMiddleware(
  onExpired: (ctx: BotContext) => Promise<void>,
) {
  return async (ctx: BotContext, next: NextFunction): Promise<void> => {
    const user = ctx.dbUser
    const sub = ctx.dbSub

    if (!user || !sub) return next()
    if (user.onboarding_step !== 'complete') return next()

    const now = new Date()

    if (sub.status === 'active' && sub.current_period_end && new Date(sub.current_period_end) > now) {
      return next()
    }
    if (sub.status === 'trial' && new Date(sub.trial_expires_at) > now) {
      return next()
    }

    if (sub.status === 'trial') {
      await supabase.from('subscriptions').update({ status: 'expired' }).eq('id', sub.id)
    }

    await onExpired(ctx)
  }
}

// ── createBot ─────────────────────────────────────────────────────────────────

export function createBot(token: string): Bot<BotContext> {
  const bot = new Bot<BotContext>(token)

  bot.use(session({
    initial: (): SessionData => ({}),
    storage: createSupabaseSessionStorage(),
  }))

  bot.use(limit())

  bot.use(conversations())

  bot.use(userMiddleware)

  return bot
}
