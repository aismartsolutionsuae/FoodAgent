import { supabase } from '@portfolio/database'
import { Langfuse } from 'langfuse'
import { getProvider } from './router'
import { estimateCostUsd } from './costs'
import type { AskOptions } from './types'

export type { AskOptions, AIProvider, ChatMessage } from './types'

// 10-minute prompt cache
const promptCache = new Map<string, { content: string; model: string; provider: string; cachedAt: number }>()
const CACHE_TTL_MS = 10 * 60 * 1000

let langfuse: Langfuse | null = null

function getLangfuse(): Langfuse | null {
  if (!process.env.LANGFUSE_SECRET_KEY || !process.env.LANGFUSE_PUBLIC_KEY) return null
  if (!langfuse) {
    langfuse = new Langfuse({
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      baseUrl: process.env.LANGFUSE_BASE_URL ?? 'https://cloud.langfuse.com',
      flushAt: 5,
      flushInterval: 10_000,
    })
  }
  return langfuse
}

// ── logAiCost ─────────────────────────────────────────────────────────────────
// Fire-and-forget запись в portfolio_events для мониторинга расходов.

function logAiCost(opts: {
  model: string
  provider: string
  promptName: string
  inputText: string
  outputText: string
  projectId?: string
  userId?: string
}): void {
  const costUsd = estimateCostUsd(opts.model, opts.inputText, opts.outputText)
  void supabase.from('portfolio_events').insert({
    project_id: opts.projectId ?? null,
    user_id: opts.userId ?? null,
    event_name: 'ai:cost',
    properties: {
      model: opts.model,
      provider: opts.provider,
      prompt_name: opts.promptName,
      input_chars: opts.inputText.length,
      output_chars: opts.outputText.length,
      cost_usd_est: Number(costUsd.toFixed(6)),
    },
  })
}

// ── getPrompt ─────────────────────────────────────────────────────────────────

export async function getPrompt(
  name: string,
  projectId?: string,
): Promise<{ content: string; model: string; provider: string; isJudge: boolean; rubricSchema: unknown }> {
  const cacheKey = `${name}:${projectId ?? ''}`
  const cached = promptCache.get(cacheKey)
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return { content: cached.content, model: cached.model, provider: cached.provider, isJudge: false, rubricSchema: null }
  }

  const query = supabase.from('prompts').select('content, model, provider, is_judge, rubric_schema')
  if (projectId) {
    query.eq('name', name).or(`project_id.eq.${projectId},project_id.is.null`)
  } else {
    query.eq('name', name).is('project_id', null)
  }
  const { data } = await query.order('project_id', { nullsFirst: false }).limit(1).single()

  const result = {
    content: data?.content ?? '',
    model: data?.model ?? 'gpt-4o',
    provider: (data?.provider as string | null) ?? 'openai',
    isJudge: data?.is_judge ?? false,
    rubricSchema: data?.rubric_schema ?? null,
  }
  promptCache.set(cacheKey, { ...result, cachedAt: Date.now() })
  return result
}

// ── ask ───────────────────────────────────────────────────────────────────────

export async function ask(
  promptName: string,
  variables: Record<string, string> = {},
  opts: AskOptions = {},
): Promise<string> {
  const { content: raw, model: dbModel, provider: dbProvider } = await getPrompt(promptName, opts.projectId)

  let content = raw
  for (const [key, val] of Object.entries(variables)) {
    content = content.replaceAll(`{{${key}}}`, val)
  }

  const providerName = (opts.provider ?? dbProvider ?? 'openai') as 'openai' | 'anthropic'
  const model = opts.model ?? dbModel
  const temperature = opts.temperature ?? 0.7
  const provider = getProvider(providerName)

  const lf = getLangfuse()
  const trace = lf?.trace({ name: `ask:${promptName}`, userId: opts.userId })
  const generation = trace?.generation({
    name: promptName,
    model,
    input: content,
    metadata: { provider: providerName, variables },
  })

  const result = await provider.complete([{ role: 'user', content }], model, temperature)

  generation?.end({ output: result })
  void lf?.flushAsync()

  logAiCost({ model, provider: providerName, promptName, inputText: content, outputText: result, projectId: opts.projectId, userId: opts.userId })

  return result
}

// ── stream ────────────────────────────────────────────────────────────────────

export async function stream(
  promptName: string,
  variables: Record<string, string> = {},
  onChunk: (chunk: string) => void,
  opts: AskOptions = {},
): Promise<void> {
  const { content: raw, model: dbModel, provider: dbProvider } = await getPrompt(promptName, opts.projectId)

  let content = raw
  for (const [key, val] of Object.entries(variables)) {
    content = content.replaceAll(`{{${key}}}`, val)
  }

  const providerName = (opts.provider ?? dbProvider ?? 'openai') as 'openai' | 'anthropic'
  const model = opts.model ?? dbModel
  const temperature = opts.temperature ?? 0.7
  const provider = getProvider(providerName)

  const lf = getLangfuse()
  const trace = lf?.trace({ name: `stream:${promptName}`, userId: opts.userId })
  const generation = trace?.generation({
    name: promptName,
    model,
    input: content,
    metadata: { provider: providerName, variables },
  })

  const chunks: string[] = []
  for await (const chunk of provider.stream([{ role: 'user', content }], model, temperature)) {
    chunks.push(chunk)
    onChunk(chunk)
  }

  const output = chunks.join('')
  generation?.end({ output })
  void lf?.flushAsync()

  logAiCost({ model, provider: providerName, promptName, inputText: content, outputText: output, projectId: opts.projectId, userId: opts.userId })
}

// ── judge ─────────────────────────────────────────────────────────────────────
// Calls an is_judge=true prompt and parses the response as JSON against rubric_schema.

export async function judge<T = unknown>(
  promptName: string,
  variables: Record<string, string> = {},
  opts: AskOptions = {},
): Promise<T> {
  const { content: raw, model: dbModel, provider: dbProvider, rubricSchema } = await getPrompt(promptName, opts.projectId)

  let content = raw
  for (const [key, val] of Object.entries(variables)) {
    content = content.replaceAll(`{{${key}}}`, val)
  }

  const providerName = (opts.provider ?? dbProvider ?? 'openai') as 'openai' | 'anthropic'
  const model = opts.model ?? dbModel
  const provider = getProvider(providerName)

  const lf = getLangfuse()
  const trace = lf?.trace({ name: `judge:${promptName}`, userId: opts.userId })
  const generation = trace?.generation({
    name: promptName,
    model,
    input: content,
    metadata: { provider: providerName, rubricSchema },
  })

  const raw_output = await provider.complete([{ role: 'user', content }], model, opts.temperature ?? 0)

  let parsed: T
  try {
    const jsonMatch = raw_output.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, raw_output]
    parsed = JSON.parse(jsonMatch[1]!.trim()) as T
  } catch {
    parsed = raw_output as unknown as T
  }

  generation?.end({ output: raw_output })
  void lf?.flushAsync()

  logAiCost({ model, provider: providerName, promptName, inputText: content, outputText: raw_output, projectId: opts.projectId, userId: opts.userId })

  return parsed
}
