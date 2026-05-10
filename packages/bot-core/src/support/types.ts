export type Sentiment = 'positive' | 'neutral' | 'negative'

export interface SentimentResult {
  sentiment: Sentiment
  score: number   // 0–1, уверенность модели
  reason: string  // краткое объяснение
}

export interface SupportContext {
  userId: string
  projectId: string
  messages: Array<{ role: 'user' | 'bot'; text: string; ts: number }>
}

export interface SupportMiddlewareOptions {
  projectId: string
  // Вызывается когда sentiment = 'negative'; проект решает что показать пользователю
  onNegative: (ctx: unknown, result: SentimentResult) => Promise<void>
  // После скольких нерешённых support-сообщений эскалировать (default: 2)
  escalationThreshold?: number
}
