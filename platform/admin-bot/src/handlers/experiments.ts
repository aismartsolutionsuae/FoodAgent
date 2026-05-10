import type { Bot } from 'grammy'

export function registerExperiments(bot: Bot): void {
  bot.command('experiments', async (ctx) => {
    const apiKey = process.env.POSTHOG_API_KEY
    const projectId = process.env.POSTHOG_PROJECT_ID
    const host = process.env.POSTHOG_HOST ?? 'https://eu.i.posthog.com'

    if (!apiKey || !projectId) {
      await ctx.reply('⚠️ POSTHOG_API_KEY или POSTHOG_PROJECT_ID не заданы.')
      return
    }

    try {
      const resp = await fetch(`${host}/api/projects/${projectId}/feature_flags/?limit=20`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      const json = await resp.json() as {
        results?: Array<{ key: string; active: boolean; rollout_percentage?: number }>
      }
      const flags = json.results ?? []

      if (!flags.length) {
        await ctx.reply('Флаги не найдены.')
        return
      }

      const lines = flags.map((f) => {
        const pct = f.rollout_percentage !== undefined ? ` ${f.rollout_percentage}%` : ''
        return `${f.active ? '🟢' : '⚪️'} ${f.key}${pct}`
      })
      await ctx.reply(`🧪 Feature flags:\n\n${lines.join('\n')}`)
    } catch {
      await ctx.reply('❌ Не удалось получить флаги PostHog.')
    }
  })
}
