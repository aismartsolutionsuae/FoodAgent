import OpenAI from 'openai'
import { supabase } from '@portfolio/database'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// 10-minute prompt cache (name → { content, model, cachedAt })
const promptCache = new Map<string, { content: string; model: string; cachedAt: number }>()
const CACHE_TTL_MS = 10 * 60 * 1000

// ── getPrompt ─────────────────────────────────────────────────────────────────
// Fetches prompt text from Supabase `prompts` table with a 10-min in-memory cache.
// project_id = null → shared; project_id = ID → project-specific (takes precedence).

export async function getPrompt(name: string, projectId?: string): Promise<string> {
  const cached = promptCache.get(name)
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) return cached.content

  const query = supabase.from('prompts').select('content, model').eq('name', name)
  if (projectId) {
    query.or(`project_id.eq.${projectId},project_id.is.null`)
  } else {
    query.is('project_id', null)
  }
  const { data } = await query.order('project_id', { nullsFirst: false }).limit(1).single()

  const content = data?.content ?? ''
  const model = data?.model ?? 'gpt-4o'
  promptCache.set(name, { content, model, cachedAt: Date.now() })
  return content
}

// ── ask ───────────────────────────────────────────────────────────────────────
// Loads a prompt by name, substitutes variables, calls OpenAI, returns string.

export interface AskOptions {
  model?: string
  temperature?: number
  userId?: string
  projectId?: string
}

export async function ask(
  promptName: string,
  variables: Record<string, string> = {},
  opts: AskOptions = {},
): Promise<string> {
  let content = await getPrompt(promptName, opts.projectId)

  for (const [key, val] of Object.entries(variables)) {
    content = content.replaceAll(`{{${key}}}`, val)
  }

  const model = opts.model ?? 'gpt-4o'

  const response = await openai.chat.completions.create({
    model,
    temperature: opts.temperature ?? 0.7,
    messages: [{ role: 'user', content }],
  })

  return response.choices[0]?.message?.content ?? ''
}

// ── stream ────────────────────────────────────────────────────────────────────
// Same as ask() but streams chunks via onChunk callback.

export async function stream(
  promptName: string,
  variables: Record<string, string> = {},
  onChunk: (chunk: string) => void,
  opts: AskOptions = {},
): Promise<void> {
  let content = await getPrompt(promptName, opts.projectId)

  for (const [key, val] of Object.entries(variables)) {
    content = content.replaceAll(`{{${key}}}`, val)
  }

  const model = opts.model ?? 'gpt-4o'

  const response = await openai.chat.completions.create({
    model,
    temperature: opts.temperature ?? 0.7,
    messages: [{ role: 'user', content }],
    stream: true,
  })

  for await (const chunk of response) {
    const text = chunk.choices[0]?.delta?.content ?? ''
    if (text) onChunk(text)
  }
}
