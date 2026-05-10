import { getProvider } from '../ai/router'
import type { SentimentResult } from './types'

const PROMPT = `Classify the sentiment of the following user message.
Reply with ONLY a JSON object in this exact format:
{"sentiment":"positive"|"neutral"|"negative","score":0.0-1.0,"reason":"one short sentence"}

User message: {{message}}`

export async function analyzeSentiment(message: string): Promise<SentimentResult> {
  try {
    const provider = getProvider('openai')
    const raw = await provider.complete(
      [{ role: 'user', content: PROMPT.replace('{{message}}', message) }],
      'gpt-4o-mini',
      0,
    )

    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return { sentiment: 'neutral', score: 0.5, reason: 'parse error' }

    const parsed = JSON.parse(match[0]) as SentimentResult
    return {
      sentiment: parsed.sentiment ?? 'neutral',
      score: Number(parsed.score ?? 0.5),
      reason: parsed.reason ?? '',
    }
  } catch {
    return { sentiment: 'neutral', score: 0.5, reason: 'analysis failed' }
  }
}
