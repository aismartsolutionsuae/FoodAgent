import { Bot } from 'grammy'
import { supabase } from '@portfolio/database'
import { services } from '../../monitor/services.js'

// Personal admin bot — only responds to the owner's Telegram ID.

if (!process.env.ADMIN_BOT_TOKEN) throw new Error('ADMIN_BOT_TOKEN is not set')

const OWNER_ID = Number(process.env.OWNER_TELEGRAM_ID ?? 0)

const bot = new Bot(process.env.ADMIN_BOT_TOKEN)

// Guard: ignore all messages not from owner
bot.use(async (ctx, next) => {
  if (ctx.from?.id !== OWNER_ID) return
  return next()
})

bot.command('start', async (ctx) => {
  await ctx.reply(
    '🤖 Portfolio Admin Bot\n\n' +
    'Commands:\n' +
    '/status — service health\n' +
    '/users — total user count\n' +
    '/revenue — this month revenue',
  )
})

bot.command('status', async (ctx) => {
  const lines = await Promise.all(
    services.map(async (svc) => {
      try {
        const resp = await fetch(svc.healthUrl, { signal: AbortSignal.timeout(5_000) })
        return `${resp.ok ? '✅' : '❌'} ${svc.name}`
      } catch {
        return `❌ ${svc.name} (unreachable)`
      }
    }),
  )
  await ctx.reply(lines.join('\n') || 'No services configured.')
})

bot.command('users', async (ctx) => {
  const { count } = await supabase.from('users').select('*', { count: 'exact', head: true })
  await ctx.reply(`👥 Total users: ${count ?? 0}`)
})

bot.command('revenue', async (ctx) => {
  const start = new Date()
  start.setDate(1)
  start.setHours(0, 0, 0, 0)

  const { data } = await supabase
    .from('portfolio_events')
    .select('properties')
    .eq('event_name', 'subscription:activated')
    .gte('created_at', start.toISOString())

  const revenue = (data ?? []).reduce((sum, row) => {
    const price = Number((row.properties as Record<string, unknown>)?.price_usd ?? 0)
    return sum + price
  }, 0)

  await ctx.reply(`💰 Revenue this month: $${revenue.toFixed(2)}`)
})

bot.start()
