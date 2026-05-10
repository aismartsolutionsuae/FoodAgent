import type { Bot } from 'grammy'

export function registerQuality(bot: Bot): void {
  bot.command('quality', async (ctx) => {
    const secretKey = process.env.LANGFUSE_SECRET_KEY
    const publicKey = process.env.LANGFUSE_PUBLIC_KEY
    const host = process.env.LANGFUSE_BASE_URL ?? 'https://cloud.langfuse.com'

    if (!secretKey || !publicKey) {
      await ctx.reply('⚠️ LANGFUSE_SECRET_KEY или LANGFUSE_PUBLIC_KEY не заданы.')
      return
    }

    try {
      const auth = Buffer.from(`${publicKey}:${secretKey}`).toString('base64')
      const resp = await fetch(
        `${host}/api/public/scores?limit=5&orderBy=timestamp&order=DESC`,
        { headers: { Authorization: `Basic ${auth}` } },
      )
      const json = await resp.json() as {
        data?: Array<{ name: string; value: number; timestamp: string }>
      }
      const scores = json.data ?? []

      if (!scores.length) {
        await ctx.reply('Оценок в Langfuse нет.')
        return
      }

      const lines = scores.map((s) => {
        const ts = new Date(s.timestamp).toLocaleDateString('ru-RU')
        return `• ${s.name}: ${s.value} (${ts})`
      })
      await ctx.reply(`📊 Последние оценки Langfuse:\n\n${lines.join('\n')}`)
    } catch {
      await ctx.reply('❌ Не удалось получить данные Langfuse.')
    }
  })
}
