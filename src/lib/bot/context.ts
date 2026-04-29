import type { Context } from 'grammy'
import type { DbUser, DbSubscription } from '@/lib/supabase/types'

// BotContext extends Grammy's default Context with our app-specific data.
// Populated by the userMiddleware before reaching any handler.
export interface BotContext extends Context {
  dbUser: DbUser | null
  dbSub: DbSubscription | null
}
