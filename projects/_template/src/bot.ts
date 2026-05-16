import { createBot } from '@portfolio/bot-core/transport/telegram'

if (!process.env.TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is not set')
if (!process.env.PROJECT_ID) throw new Error('PROJECT_ID is not set')

export const bot = createBot(process.env.TELEGRAM_BOT_TOKEN, process.env.PROJECT_ID)
