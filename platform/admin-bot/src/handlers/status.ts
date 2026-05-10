import type { Bot } from 'grammy'
import { services } from '../../../monitor/services'

export function registerStatus(bot: Bot): void {
  bot.command('status', async (ctx) => {
    const lines = await Promise.all(
      services.map(async (svc) => {
        try {
          const resp = await fetch(svc.healthUrl, { signal: AbortSignal.timeout(5_000) })
          return `${resp.ok ? '✅' : '❌'} ${svc.name}`
        } catch {
          return `❌ ${svc.name} (недоступен)`
        }
      }),
    )
    await ctx.reply(lines.join('\n') || 'Сервисы не настроены.')
  })
}
