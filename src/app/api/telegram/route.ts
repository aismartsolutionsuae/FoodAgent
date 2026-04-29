import { bot } from '@/lib/bot/index'
import type { Update } from 'grammy/types'

let botInitPromise: Promise<void> | null = null
let botInitialized = false

async function ensureBotReady() {
  if (botInitialized) return
  if (!botInitPromise) {
    botInitPromise = bot.init()
      .then(() => {
        botInitialized = true
      })
      .catch((err) => {
        botInitPromise = null
        throw err
      })
  }
  await botInitPromise
}

export async function POST(req: Request) {
  const secret = req.headers.get('x-telegram-bot-api-secret-token')

  if (!process.env.TELEGRAM_WEBHOOK_SECRET || secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    // Ignore malformed payloads so random probes don't trigger 5xx retries.
    return new Response('ok', { status: 200 })
  }
  await ensureBotReady()

  if (!body || typeof body !== 'object' || !('update_id' in body)) {
    return new Response('ok', { status: 200 })
  }

  // Fire-and-forget — Telegram requires a 200 within 10s, but search + LLM can take longer.
  bot.handleUpdate(body as Update).catch(console.error)

  return new Response('ok', { status: 200 })
}
