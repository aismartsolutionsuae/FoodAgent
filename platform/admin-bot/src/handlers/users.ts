import type { Bot } from 'grammy'
import { supabase } from '@portfolio/database'

export function registerUsers(bot: Bot): void {
  bot.command('users', async (ctx) => {
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
    await ctx.reply(`👥 Всего пользователей: ${count ?? 0}`)
  })

  bot.command('revenue', async (ctx) => {
    const start = new Date()
    start.setDate(1)
    start.setHours(0, 0, 0, 0)

    const { data } = await supabase
      .from('portfolio_events')
      .select('revenue_usd')
      .gte('created_at', start.toISOString())
      .not('revenue_usd', 'is', null)

    const revenue = (data ?? []).reduce((sum, row) => sum + Number(row.revenue_usd ?? 0), 0)
    await ctx.reply(`💰 Выручка за месяц: $${revenue.toFixed(2)}`)
  })
}
