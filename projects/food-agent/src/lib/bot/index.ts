import { InlineKeyboard } from 'grammy'
import { createBot, createSubscriptionMiddleware } from '@portfolio/bot-core/transport/telegram'
import type { BotContext } from './context'
import { handleStart } from './handlers/start'
import { handleLanguageCommand, handleLanguageCallback } from './handlers/language'
import { handleProfileCommand, handleProfileEditCallback,
         handlePlatformToggle, handlePlatformsDone,
         handleRatingSelect } from './handlers/profile'
import { handleCancel } from './handlers/cancel'
import {
  handleOnboardingMessage,
  handleLocationMessage,
  handleCuisineToggle,
  handleCuisineDone,
  handleStopToggle,
  handleStopNone,
  handleStopDone,
  handleVeganSelect,
  handleLightVeganToggle,
  handleLightVeganDone,
  handleGoalSelect,
  handleOnboardingSetArea,
  handleSkipAddress,
} from './handlers/onboarding'
import { handleVoiceMessage } from './handlers/voice'
import {
  handleFoodSearch,
  handleOrderAreaSelection,
  handleOrderAreaSaveSelection,
  maybeHandleCurrentAreaText,
  maybeHandleCurrentAreaLocation,
} from './handlers/search'
import { supabase } from '@/lib/supabase/client'
import { i18n } from './i18n'

if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN is not set')
}

export const bot = createBot(process.env.TELEGRAM_BOT_TOKEN)

let commandsRegistered = false
async function ensureCommandsRegistered() {
  if (commandsRegistered) return
  commandsRegistered = true

  const call = (cmds: { command: string; description: string }[], lang?: string) =>
    bot.api.setMyCommands(cmds, lang ? { language_code: lang as 'ru' } : {})
      .catch((err: unknown) => console.error('[commands]', err))

  await call([
    { command: 'start',    description: 'Начать / Start / ابدأ' },
    { command: 'profile',  description: 'Настройки профиля / My profile / ملفي' },
    { command: 'language', description: 'Сменить язык / Change language / تغيير اللغة' },
    { command: 'cancel',   description: 'Отменить действие / Cancel / إلغاء' },
  ])
  await call([
    { command: 'start',    description: 'Начать' },
    { command: 'profile',  description: 'Настройки профиля' },
    { command: 'language', description: 'Сменить язык' },
    { command: 'cancel',   description: 'Отменить действие' },
  ], 'ru')
  await call([
    { command: 'start',    description: 'Start' },
    { command: 'profile',  description: 'My profile' },
    { command: 'language', description: 'Change language' },
    { command: 'cancel',   description: 'Cancel' },
  ], 'en')
  await call([
    { command: 'start',    description: 'ابدأ' },
    { command: 'profile',  description: 'ملفي الشخصي' },
    { command: 'language', description: 'تغيير اللغة' },
    { command: 'cancel',   description: 'إلغاء' },
  ], 'ar')
}

// ── 1. Lazy command registration ──────────────────────────────────────────────
// userMiddleware already ran inside createBot(); no need to re-register it.
bot.use(async (ctx, next) => {
  ensureCommandsRegistered()
  return next()
})

// ── 2. Commands always allowed (no subscription check) ────────────────────────
bot.command('start', handleStart)
bot.command('language', handleLanguageCommand)
bot.command('profile', handleProfileCommand)
bot.command('cancel', handleCancel)

// ── 3. Callback queries (button taps) ─────────────────────────────────────────

// Language
bot.callbackQuery(/^lang:(ru|en|ar)$/, handleLanguageCallback)

// Cuisine multi-select
bot.callbackQuery(/^toggle_cuisine:(.+)$/, handleCuisineToggle)
bot.callbackQuery('cuisine_done', handleCuisineDone)

// Stop-list multi-select
bot.callbackQuery(/^toggle_stop:(.+)$/, handleStopToggle)
bot.callbackQuery('stop_none', handleStopNone)
bot.callbackQuery('stop_done', handleStopDone)

// Vegan / diet type
bot.callbackQuery(/^vegan:(none|strict|light)$/, handleVeganSelect)
bot.callbackQuery(/^toggle_lvegan:(.+)$/,        handleLightVeganToggle)
bot.callbackQuery('lvegan_done',                  handleLightVeganDone)

// Goal
bot.callbackQuery(/^goal:(diet|variety|balance)$/, handleGoalSelect)

// Address onboarding (soft step)
bot.callbackQuery('onboarding_set_area', handleOnboardingSetArea)
bot.callbackQuery('skip_address',        handleSkipAddress)
bot.callbackQuery(/^order_area:(home|work|current_text|current_geo)$/, handleOrderAreaSelection)
bot.callbackQuery(/^order_area_save:(home|work|skip)$/, handleOrderAreaSaveSelection)

// Profile editing
bot.callbackQuery(/^profile_edit:(.+)$/, handleProfileEditCallback)
bot.callbackQuery(/^toggle_platform:(.+)$/, handlePlatformToggle)
bot.callbackQuery('platforms_done', handlePlatformsDone)
bot.callbackQuery(/^rating:(.+)$/, handleRatingSelect)

// ── 4. Everything else requires active subscription ───────────────────────────
bot.use(createSubscriptionMiddleware(async (ctx) => {
  const s = i18n(ctx.dbUser?.language)
  const checkoutUrl = `${process.env.LEMONSQUEEZY_CHECKOUT_URL ?? '#'}?checkout[custom][telegram_id]=${ctx.dbUser!.telegram_id}`
  await ctx.reply(s.trial_expired_msg, {
    reply_markup: new InlineKeyboard().url(s.subscribe_btn, checkoutUrl),
  })
}))

// Voice (Whisper transcription → food search)
bot.on('message:voice', handleVoiceMessage)

// Location share (address step)
bot.on('message:location', async (ctx) => {
  const usedBySearch = await maybeHandleCurrentAreaLocation(ctx)
  if (usedBySearch) return
  await handleLocationMessage(ctx)
})

// Text messages: onboarding steps or food search
bot.on('message:text', async (ctx, next) => {
  // Let onboarding handler consume steps it owns (name, address)
  await handleOnboardingMessage(ctx, async () => {
    if (ctx.message?.text && !ctx.message.text.startsWith('/')) {
      const usedBySearchArea = await maybeHandleCurrentAreaText(ctx, ctx.message.text.trim())
      if (usedBySearchArea) return
    }

    // User is 'complete' — treat as a food search query
    if (ctx.message?.text && !ctx.message.text.startsWith('/')) {
      await handleFoodSearch(ctx, ctx.message.text.trim())
    } else {
      return next()
    }
  })
})

// Search-result button callbacks (registered after subscription check)
bot.callbackQuery('search_surprise', async (ctx) => {
  await ctx.answerCallbackQuery()
  if (!ctx.dbUser?.last_query) return
  await handleFoodSearch(ctx, ctx.dbUser.last_query, { ignoreCuisineBoost: true, skipAreaPrompt: true, areaOverride: null })
})
bot.callbackQuery('retry_search', async (ctx) => {
  await ctx.answerCallbackQuery()
  if (!ctx.dbUser?.last_query) {
    const s = i18n(ctx.dbUser?.language)
    await ctx.reply(s.unknown_command)
    return
  }
  await handleFoodSearch(ctx, ctx.dbUser.last_query, { skipAreaPrompt: true, areaOverride: null })
})
bot.callbackQuery('search_no_filters', async (ctx) => {
  await ctx.answerCallbackQuery()
  if (!ctx.dbUser?.last_query) {
    const s = i18n(ctx.dbUser?.language)
    await ctx.reply(s.unknown_command)
    return
  }
  await handleFoodSearch(ctx, ctx.dbUser.last_query, { noFilters: true, ignoreCuisineBoost: true, skipAreaPrompt: true, areaOverride: null })
})
bot.callbackQuery('dismiss_alert', async (ctx) => {
  await ctx.answerCallbackQuery()
  await ctx.deleteMessage().catch(() => {})
})
bot.callbackQuery('conflict:bypass', async (ctx) => {
  await ctx.answerCallbackQuery()
  if (!ctx.dbUser?.last_query) return
  await handleFoodSearch(ctx, ctx.dbUser.last_query, { noFilters: true, ignoreCuisineBoost: true, skipAreaPrompt: true, areaOverride: null })
})
bot.callbackQuery(/^conflict:remove_stop:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  if (!ctx.dbUser || !ctx.match) return
  const item = ctx.match[1]

  const { data: pref } = await supabase
    .from('preferences')
    .select('stop_list')
    .eq('user_id', ctx.dbUser.id)
    .single()

  const current: string[] = pref?.stop_list ?? []
  const updated = current.filter((x) => x !== item)
  await supabase.from('preferences').update({ stop_list: updated }).eq('user_id', ctx.dbUser.id)

  if (!ctx.dbUser.last_query) return
  await handleFoodSearch(ctx, ctx.dbUser.last_query, { skipAreaPrompt: true, areaOverride: null })
})

// Fallback
bot.on('message', async (ctx) => {
  const s = i18n(ctx.dbUser?.language)
  await ctx.reply(s.unknown_command)
})
