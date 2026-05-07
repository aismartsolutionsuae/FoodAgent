import type { BotContext } from '../context'
import { supabase } from '@/lib/supabase/client'
import { i18n } from '../i18n'
import {
  buildCuisineKeyboard,
  buildStopListKeyboard,
  buildLanguageKeyboard,
  buildVeganKeyboard,
  buildLightVeganKeyboard,
  buildGoalKeyboard,
  buildAddressOnboardingKeyboard,
} from '../keyboards'

const TOTAL_STEPS = 5

function prog(step: number, s: ReturnType<typeof i18n>): string {
  return s.onboarding_progress(step, TOTAL_STEPS)
}

export async function handleStart(ctx: BotContext) {
  if (!ctx.from) return

  if (!ctx.dbUser) {
    await supabase.from('users').insert({
      telegram_id: ctx.from.id,
      language: 'ru',
      onboarding_step: 'language',
    })

    await ctx.reply('🇷🇺 Русский / 🇬🇧 English / 🇸🇦 العربية', {
      reply_markup: buildLanguageKeyboard(null),
    })
    return
  }

  if (ctx.dbUser.onboarding_step === 'complete') {
    const s = i18n(ctx.dbUser.language)
    const name = ctx.dbUser.name ?? ctx.from?.first_name ?? ''
    await ctx.reply(s.welcome_back(name))
    return
  }

  await resumeOnboarding(ctx)
}

// Re-sends the prompt for the current onboarding step.
export async function resumeOnboarding(ctx: BotContext) {
  if (!ctx.dbUser) return
  const s = i18n(ctx.dbUser.language)
  const lang = ctx.dbUser.language

  switch (ctx.dbUser.onboarding_step) {
    case 'language':
      await ctx.reply(s.choose_language, { reply_markup: buildLanguageKeyboard(lang) })
      break

    case 'name':
      await ctx.reply(`${prog(1, s)}\n\n${s.welcome}\n\n${s.ask_name}`)
      break

    case 'cuisine': {
      const { data: pref } = await supabase
        .from('preferences').select('cuisines').eq('user_id', ctx.dbUser.id).single()
      await ctx.reply(`${prog(2, s)}\n\n${s.ask_cuisine}`, {
        reply_markup: buildCuisineKeyboard(lang, pref?.cuisines ?? []),
      })
      break
    }

    case 'stop_list': {
      const { data: pref } = await supabase
        .from('preferences').select('stop_list').eq('user_id', ctx.dbUser.id).single()
      await ctx.reply(`${prog(3, s)}\n\n${s.ask_stop_list}`, {
        reply_markup: buildStopListKeyboard(lang, pref?.stop_list ?? []),
      })
      break
    }

    case 'vegan':
      await ctx.reply(`${prog(4, s)}\n\n${s.ask_vegan}`, { reply_markup: buildVeganKeyboard(s) })
      break

    case 'light_vegan': {
      const { data: pref } = await supabase
        .from('preferences').select('stop_list').eq('user_id', ctx.dbUser.id).single()
      await ctx.reply(`${prog(4, s)}\n\n${s.ask_light_vegan}`, {
        reply_markup: buildLightVeganKeyboard(lang, pref?.stop_list ?? []),
      })
      break
    }

    case 'goal':
      await ctx.reply(`${prog(5, s)}\n\n${s.ask_goal}`, { reply_markup: buildGoalKeyboard(s) })
      break

    case 'address':
      await ctx.reply(s.ask_address_soft, {
        reply_markup: buildAddressOnboardingKeyboard(s),
      })
      break

    default: {
      // Legacy step not in current flow — heal user to complete state
      await supabase.from('users')
        .update({ onboarding_step: 'complete', edit_mode: false })
        .eq('id', ctx.dbUser.id)
      ctx.dbUser.onboarding_step = 'complete'
      const name = ctx.dbUser.name ?? ctx.from?.first_name ?? ''
      await ctx.reply(s.welcome_back(name))
    }
  }
}
