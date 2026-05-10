import Anthropic from '@anthropic-ai/sdk'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'
import type { AIProvider, ChatMessage } from '../types'

export function createAnthropicProvider(apiKey: string): AIProvider {
  const client = new Anthropic({ apiKey })

  function toParams(messages: ChatMessage[]): { system?: string; messages: MessageParam[] } {
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n') || undefined
    const msgs: MessageParam[] = messages
      .filter((m): m is ChatMessage & { role: 'user' | 'assistant' } => m.role !== 'system')
    return { system, messages: msgs }
  }

  return {
    name: 'anthropic',

    async complete(messages: ChatMessage[], model: string, temperature: number): Promise<string> {
      const { system, messages: msgs } = toParams(messages)
      const response = await client.messages.create({
        model,
        max_tokens: 4096,
        temperature,
        ...(system ? { system } : {}),
        messages: msgs,
      })
      const block = response.content[0]
      return block?.type === 'text' ? block.text : ''
    },

    async *stream(messages: ChatMessage[], model: string, temperature: number): AsyncIterable<string> {
      const { system, messages: msgs } = toParams(messages)
      const response = await client.messages.create({
        model,
        max_tokens: 4096,
        temperature,
        ...(system ? { system } : {}),
        messages: msgs,
        stream: true,
      })
      for await (const event of response) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          yield event.delta.text
        }
      }
    },
  }
}
