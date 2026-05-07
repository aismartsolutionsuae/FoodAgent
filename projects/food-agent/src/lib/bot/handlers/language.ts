import type { BotContext } from '../context'
import { supabase } from '@/lib/supabase/client'
import { i18n, languageLabel } from '../i18n'
import type { Language } from '@/lib/supabase/types'
import { resumeOnboarding } from './start'
import { buildLanguageKeyboard } from '../keyboards'

export async function handleLanguageCommand(ctx: BotContext) {
  const s = i18n(ctx.dbUser?.language)
  await ctx.reply(s.language_prompt, { reply_markup: buildLanguageKeyboard(ctx.dbUser?.language) })
}

export async function handleLanguageCallback(ctx: BotContext) {
  await ctx.answerCallbackQuery()

  if (!ctx.from || !ctx.match) return

  const lang = ctx.match[1] as Language

  if (!ctx.dbUser) {
    // This shouldn't happen — user was created in /start before showing the picker
    return
  }

  // Determine next onboarding step
  const isFirstTimeSelection = ctx.dbUser.onboarding_step === 'language'
  const nextStep = isFirstTimeSelection ? 'name' : ctx.dbUser.onboarding_step

  await supabase
    .from('users')
    .update({ language: lang, onboarding_step: nextStep })
    .eq('id', ctx.dbUser.id)

  ctx.dbUser.language = lang
  ctx.dbUser.onboarding_step = nextStep

  const s = i18n(lang)
  await ctx.reply(s.language_set)

  if (isFirstTimeSelection) {
    await ctx.reply(s.welcome + '\n\n' + s.ask_name, { parse_mode: 'Markdown' })

    // Create subscription row — ignoreDuplicates protects the trial if user
    // deleted and re-added the bot (telegram_id is preserved in Supabase).
    await supabase.from('subscriptions').upsert(
      { user_id: ctx.dbUser.id },
      { onConflict: 'user_id', ignoreDuplicates: true },
    )
  }
}
