import { Bot } from 'grammy'
import { registerDashboard } from './handlers/dashboard'
import { registerEconomy } from './handlers/economy'
import { registerStatus } from './handlers/status'
import { registerUsers } from './handlers/users'
import { registerPending } from './handlers/pending'
import { registerExperiments } from './handlers/experiments'
import { registerQuality } from './handlers/quality'
import { registerIncidents } from './handlers/incidents'

if (!process.env.ADMIN_BOT_TOKEN) throw new Error('ADMIN_BOT_TOKEN is not set')

const OWNER_ID = Number(process.env.OWNER_TELEGRAM_ID ?? 0)
const bot = new Bot(process.env.ADMIN_BOT_TOKEN)

bot.use(async (ctx, next) => {
  if (ctx.from?.id !== OWNER_ID) return
  return next()
})

bot.command('start', async (ctx) => {
  await ctx.reply(
    '🤖 Portfolio Admin Bot\n\n' +
    '/dashboard — сводка по всем проектам\n' +
    '/economy — полная экономика (доходы / AI / инфра)\n' +
    '/status — health check сервисов\n' +
    '/users — кол-во пользователей\n' +
    '/pending — очередь одобрения\n' +
    '/experiments — PostHog флаги\n' +
    '/quality — оценки Langfuse\n' +
    '/incidents — инциденты BetterStack',
  )
})

registerDashboard(bot)
registerEconomy(bot)
registerStatus(bot)
registerUsers(bot)
registerPending(bot)
registerExperiments(bot)
registerQuality(bot)
registerIncidents(bot)

bot.api.setMyCommands([
  { command: 'start',       description: 'Главное меню' },
  { command: 'dashboard',   description: 'Сводка по всем проектам' },
  { command: 'economy',     description: 'Полная экономика (P&L)' },
  { command: 'status',      description: 'Health check сервисов' },
  { command: 'users',       description: 'Кол-во пользователей' },
  { command: 'pending',     description: 'Очередь одобрения' },
  { command: 'experiments', description: 'PostHog feature flags' },
  { command: 'quality',     description: 'Оценки Langfuse' },
  { command: 'incidents',   description: 'Инциденты BetterStack' },
]).catch(console.error)

bot.start()
