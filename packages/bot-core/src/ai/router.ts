import { createOpenAIProvider } from './providers/openai'
import { createAnthropicProvider } from './providers/anthropic'
import type { AIProvider } from './types'

let openaiProvider: AIProvider | null = null
let anthropicProvider: AIProvider | null = null

export function getProvider(name: 'openai' | 'anthropic' = 'openai'): AIProvider {
  if (name === 'anthropic') {
    if (!anthropicProvider) {
      const key = process.env.ANTHROPIC_API_KEY
      if (!key) throw new Error('ANTHROPIC_API_KEY is not set')
      anthropicProvider = createAnthropicProvider(key)
    }
    return anthropicProvider
  }

  if (!openaiProvider) {
    const key = process.env.OPENAI_API_KEY
    if (!key) throw new Error('OPENAI_API_KEY is not set')
    openaiProvider = createOpenAIProvider(key)
  }
  return openaiProvider
}
