import { createBot, createSubscriptionMiddleware } from '@portfolio/bot-core/transport/telegram'
import { InlineKeyboard } from 'grammy'

if (!process.env.BOT_TOKEN) throw new Error('BOT_TOKEN is not set')

export const bot = createBot(process.env.BOT_TOKEN)

// ── Free commands (no subscription check) ────────────────────────────────────

bot.command('start', async (ctx) => {
  await ctx.reply('Hello! Send /help for commands.')
})

bot.command('help', async (ctx) => {
  await ctx.reply('Available commands:\n/start — start\n/help — this message')
})

// ── Subscription gate ─────────────────────────────────────────────────────────

bot.use(createSubscriptionMiddleware(async (ctx) => {
  const checkoutUrl = `${process.env.LEMONSQUEEZY_CHECKOUT_URL ?? '#'}?checkout[custom][telegram_id]=${ctx.dbUser!.telegram_id}`
  await ctx.reply('Your trial has expired. Subscribe to continue:', {
    reply_markup: new InlineKeyboard().url('Subscribe', checkoutUrl),
  })
}))

// ── Paid handlers ─────────────────────────────────────────────────────────────

bot.on('message:text', async (ctx) => {
  await ctx.reply(`You said: ${ctx.message.text}`)
})

bot.on('message', async (ctx) => {
  await ctx.reply('Unknown command.')
})
