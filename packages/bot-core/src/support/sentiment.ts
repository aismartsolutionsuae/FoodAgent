import { ask } from '../ai/index'
import type { SentimentResult } from './types'

// Prompt lives in Supabase as shared row 'support:sentiment'
// (migrations/005_shared_agent_prompts.sql). Model: gpt-4o-mini.
export async function analyzeSentiment(message: string): Promise<SentimentResult> {
  try {
    const raw = await ask('support:sentiment', { message })

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
