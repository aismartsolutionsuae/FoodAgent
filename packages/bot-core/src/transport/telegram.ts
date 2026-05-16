import { Bot, Context, NextFunction, session, type SessionFlavor } from 'grammy'
import { conversations, type ConversationFlavor } from '@grammyjs/conversations'
import { limit } from '@grammyjs/ratelimiter'
import { supabase, type DbUser, type DbSubscription } from '@portfolio/database'
import { type SessionData, createSupabaseSessionStorage } from '../session/index.js'
import { resolveUser } from '../identity/index.js'

// ── Context ────────────────────────────────────────────────────────────────────

// Build context type step by step to avoid circular references.
type _BaseCtx = Context & SessionFlavor<SessionData>

export type BotContext = ConversationFlavor<_BaseCtx> & {
  dbUser: DbUser | null
}

// ── User middleware ────────────────────────────────────────────────────────────
// Resolves the omnichannel user for this project (get-or-create). projectId is
// captured from createBot. Identity only — subscription is a separate, opt-in
// concern (subscription-model products only).

export function createUserMiddleware(projectId: string) {
  return async function userMiddleware(ctx: BotContext, next: NextFunction): Promise<void> {
    ctx.dbUser = null
    const telegramId = ctx.from?.id
    if (!telegramId) return next()
    ctx.dbUser = await resolveUser('telegram', String(telegramId), projectId)
    return next()
  }
}

// ── Subscription middleware ────────────────────────────────────────────────────
// Opt-in: only subscription-model products wire this. Fetches its own
// subscription row; no dependency on product-specific onboarding state (the
// product applies its own onboarding gate before this middleware if needed).

export function createSubscriptionMiddleware(
  onExpired: (ctx: BotContext) => Promise<void>,
) {
  return async (ctx: BotContext, next: NextFunction): Promise<void> => {
    const user = ctx.dbUser
    if (!user) return next()

    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!data) return next()
    const sub = data as DbSubscription
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
// projectId scopes identity and (later) events to this product.

export function createBot(token: string, projectId: string): Bot<BotContext> {
  const bot = new Bot<BotContext>(token)

  bot.use(session({
    initial: (): SessionData => ({}),
    storage: createSupabaseSessionStorage(),
  }))

  bot.use(limit())

  bot.use(conversations())

  bot.use(createUserMiddleware(projectId))

  return bot
}
