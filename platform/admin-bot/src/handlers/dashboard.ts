import type { Bot } from 'grammy'
import { supabase } from '@portfolio/database'
import { projects } from '../../../monitor/services'

export function registerDashboard(bot: Bot): void {
  bot.command('dashboard', async (ctx) => {
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const sections = await Promise.all(
      projects.map(async (project) => {
        const { count: userCount } = await supabase
          .from('portfolio_events')
          .select('user_id', { count: 'exact', head: true })
          .eq('project_id', project.id)

        const { data: revenueRows } = await supabase
          .from('portfolio_events')
          .select('revenue_usd')
          .eq('project_id', project.id)
          .gte('created_at', monthStart.toISOString())
          .not('revenue_usd', 'is', null)

        const mrr = (revenueRows ?? []).reduce(
          (sum, r) => sum + Number(r.revenue_usd ?? 0),
          0,
        )

        const mainService = project.services[0]
        let health = '❓'
        if (mainService) {
          try {
            const resp = await fetch(mainService.healthUrl, { signal: AbortSignal.timeout(4_000) })
            health = resp.ok ? '✅' : '❌'
          } catch {
            health = '❌'
          }
        }

        const statusEmoji: Record<string, string> = {
          active: '🟢', dev: '🔵', frozen: '🟡', archived: '⚫️',
        }

        return (
          `${statusEmoji[project.status] ?? '⚪️'} <b>${project.name}</b> [${project.status}]\n` +
          `${health} Сервис · 👥 ${userCount ?? 0} польз. · 💰 $${mrr.toFixed(0)}/мес`
        )
      }),
    )

    await ctx.reply(
      `📊 <b>Portfolio Dashboard</b>\n\n${sections.join('\n\n')}`,
      { parse_mode: 'HTML' },
    )
  })
}
