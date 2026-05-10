import { NextRequest, NextResponse } from 'next/server'
import { ask } from '@portfolio/bot-core/ai'

// POST /api/internal/ai/ask
// Called by n8n or other internal automation tools.
// Body: { prompt: string; variables?: Record<string, string>; model?: string; provider?: 'openai' | 'anthropic' }
// Auth: shared secret via Authorization: Bearer <INTERNAL_API_SECRET>

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = req.headers.get('authorization') ?? ''
  const secret = process.env.INTERNAL_API_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body || typeof body.prompt !== 'string') {
    return NextResponse.json({ error: 'Missing required field: prompt' }, { status: 400 })
  }

  const { prompt, variables = {}, model, provider, projectId } = body as {
    prompt: string
    variables?: Record<string, string>
    model?: string
    provider?: 'openai' | 'anthropic'
    projectId?: string
  }

  const result = await ask(prompt, variables, { model, provider, projectId })
  return NextResponse.json({ result })
}
