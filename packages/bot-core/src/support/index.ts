import type { Context, Middleware } from 'grammy'
import { analyzeSentiment } from './sentiment'
import { reportBug, escalateToHuman } from './tools'
import type { SupportContext, SupportMiddlewareOptions } from './types'

export type { Sentiment, SentimentResult, SupportContext, SupportMiddlewareOptions } from './types'
export { reportBug, escalateToHuman, logFeatureSignal, notifyOwner } from './tools'
export { analyzeSentiment } from './sentiment'

// Счётчик нерешённых support-сообщений на пользователя (in-memory, сбрасывается при рестарте)
const supportCountByUser = new Map<string, number>()

// ── createSupportMiddleware ───────────────────────────────────────────────────
// Grammy middleware, который перехватывает негативные сообщения.
// Подключается один раз: bot.use(createSupportMiddleware({ projectId, onNegative }))
//
// Поведение:
//   1. Анализирует sentiment каждого текстового сообщения (gpt-4o-mini)
//   2. Positive/neutral → пропускает дальше без изменений
//   3. Negative → вызывает onNegative, НЕ пропускает следующий middleware
//   4. Если у пользователя ≥ escalationThreshold нерешённых — escalateToHuman()

export function createSupportMiddleware(
  opts: SupportMiddlewareOptions,
): Middleware<Context & { dbUser?: { id: string } | null }> {
  const threshold = opts.escalationThreshold ?? 2

  return async (ctx, next) => {
    const text = ctx.message?.text
    if (!text || !ctx.from) return next()

    const userId = (ctx as { dbUser?: { id: string } | null }).dbUser?.id
    if (!userId) return next()

    const result = await analyzeSentiment(text)

    if (result.sentiment !== 'negative') return next()

    // Инкрементируем счётчик
    const prev = supportCountByUser.get(userId) ?? 0
    const current = prev + 1
    supportCountByUser.set(userId, current)

    // Уведомляем проект о негативном сообщении
    await opts.onNegative(ctx, result)

    if (current >= threshold) {
      supportCountByUser.delete(userId)

      const supportCtx: SupportContext = {
        userId,
        projectId: opts.projectId,
        messages: [{ role: 'user', text, ts: Date.now() }],
      }

      const ticketId = await reportBug(supportCtx, `Негатив (${current} сообщений): ${text.slice(0, 200)}`)
      await escalateToHuman(supportCtx, ticketId)
    }

    // Не пропускаем в основной flow — support перехватил
  }
}
