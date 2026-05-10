import type { Bot } from 'grammy'
import { supabase } from '@portfolio/database'
import { projects } from '../../../monitor/services'

export function registerEconomy(bot: Bot): void {
  bot.command('economy', async (ctx) => {
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const monthLabel = monthStart.toLocaleString('ru-RU', { month: 'long', year: 'numeric' })

    const sections: string[] = []

    for (const project of projects) {
      const { data: revenueRows } = await supabase
        .from('portfolio_events')
        .select('revenue_usd')
        .eq('project_id', project.id)
        .gte('created_at', monthStart.toISOString())
        .not('revenue_usd', 'is', null)

      const revenue = (revenueRows ?? []).reduce((s, r) => s + Number(r.revenue_usd ?? 0), 0)

      const { data: costRows } = await supabase
        .from('portfolio_events')
        .select('properties')
        .eq('project_id', project.id)
        .eq('event_name', 'ai:cost')
        .gte('created_at', monthStart.toISOString())

      const costByModel: Record<string, { cost: number; calls: number }> = {}
      let totalAiCost = 0

      for (const row of costRows ?? []) {
        const p = row.properties as Record<string, unknown>
        const model = String(p.model ?? 'unknown')
        const cost = Number(p.cost_usd_est ?? 0)
        if (!costByModel[model]) costByModel[model] = { cost: 0, calls: 0 }
        costByModel[model].cost += cost
        costByModel[model].calls += 1
        totalAiCost += cost
      }

      const aiLines = Object.entries(costByModel)
        .sort((a, b) => b[1].cost - a[1].cost)
        .map(([model, { cost, calls }]) => `  ${model}: ~$${cost.toFixed(3)} (${calls} вызовов)`)
        .join('\n')

      const infraTotal = (project.infraCosts ?? []).reduce((s, c) => s + c.perMonthUsd, 0)
      const infraLines = (project.infraCosts ?? [])
        .map((c) => `  ${c.label}: ~$${c.perMonthUsd}/мес`)
        .join('\n')

      const profit = revenue - totalAiCost - infraTotal

      sections.push(
        `📦 <b>${project.name}</b> [${project.status}]\n` +
        `\n💰 <b>Доходы</b>\n  MRR: $${revenue.toFixed(2)}\n` +
        `\n🤖 <b>AI расходы</b> (~ориентировочно)\n` +
          (aiLines || '  нет данных') + `\n  Итого: ~$${totalAiCost.toFixed(3)}\n` +
        `\n🏗 <b>Инфраструктура</b> (~ориентировочно)\n` +
          (infraLines || '  не задана') + `\n  Итого: ~$${infraTotal.toFixed(0)}/мес\n` +
        `\n📈 <b>Итог</b>\n` +
          `  Доходы: $${revenue.toFixed(2)}\n` +
          `  Расходы (AI): ~$${totalAiCost.toFixed(2)}\n` +
          `  Расходы (инфра ~): ~$${infraTotal.toFixed(0)}\n` +
          `  Прибыль: ~$${profit.toFixed(2)}`
      )
    }

    const header = `📊 <b>Экономика портфолио — ${monthLabel}</b>\n` +
      `<i>Расходы на AI и инфраструктуру — ориентировочные (~)</i>\n`

    await ctx.reply(
      header + '\n' + sections.join('\n\n─────────────────\n\n'),
      { parse_mode: 'HTML' },
    )
  })
}
