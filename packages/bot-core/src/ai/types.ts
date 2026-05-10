export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AIProvider {
  name: string
  complete(messages: ChatMessage[], model: string, temperature: number): Promise<string>
  stream(messages: ChatMessage[], model: string, temperature: number): AsyncIterable<string>
}

export interface AskOptions {
  model?: string
  temperature?: number
  userId?: string
  projectId?: string
  provider?: 'openai' | 'anthropic'
}
