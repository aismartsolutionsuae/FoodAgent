import type { Bot } from 'grammy'

export function registerIncidents(bot: Bot): void {
  bot.command('incidents', async (ctx) => {
    const token = process.env.BETTERSTACK_API_TOKEN

    if (!token) {
      await ctx.reply('⚠️ BETTERSTACK_API_TOKEN не задан.')
      return
    }

    try {
      const resp = await fetch(
        'https://uptime.betterstack.com/api/v2/incidents?per_page=10&resolved=false',
        { headers: { Authorization: `Bearer ${token}` } },
      )
      const json = await resp.json() as {
        data?: Array<{ id: string; attributes: { name: string; started_at: string; cause: string } }>
      }
      const incidents = json.data ?? []

      if (!incidents.length) {
        await ctx.reply('✅ Активных инцидентов нет.')
        return
      }

      const lines = incidents.map((inc) => {
        const ts = new Date(inc.attributes.started_at).toLocaleString('ru-RU')
        return `🔴 ${inc.attributes.name}\n   С: ${ts}\n   Причина: ${inc.attributes.cause ?? 'неизвестно'}`
      })
      await ctx.reply(`🚨 Открытые инциденты (${incidents.length}):\n\n${lines.join('\n\n')}`)
    } catch {
      await ctx.reply('❌ Не удалось получить инциденты BetterStack.')
    }
  })
}
