import { createBot } from '@portfolio/bot-core/transport/telegram'

if (!process.env.TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is not set')

export const bot = createBot(process.env.TELEGRAM_BOT_TOKEN)
