import { NextRequest, NextResponse } from 'next/server'
import { webhookCallback } from 'grammy'
import { bot } from '../../../bot'

// Fire-and-forget: respond to Telegram immediately, process in background.
export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = req.headers.get('x-telegram-bot-api-secret-token')
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const handler = webhookCallback(bot, 'std/http')
  return handler(req) as Promise<NextResponse>
}
