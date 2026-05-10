import OpenAI from 'openai'
import type { AIProvider, ChatMessage } from '../types'

export function createOpenAIProvider(apiKey: string): AIProvider {
  const client = new OpenAI({ apiKey })

  return {
    name: 'openai',

    async complete(messages: ChatMessage[], model: string, temperature: number): Promise<string> {
      const response = await client.chat.completions.create({
        model,
        temperature,
        messages,
      })
      return response.choices[0]?.message?.content ?? ''
    },

    async *stream(messages: ChatMessage[], model: string, temperature: number): AsyncIterable<string> {
      const response = await client.chat.completions.create({
        model,
        temperature,
        messages,
        stream: true,
      })
      for await (const chunk of response) {
        const text = chunk.choices[0]?.delta?.content ?? ''
        if (text) yield text
      }
    },
  }
}
