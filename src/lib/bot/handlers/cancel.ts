import type { BotContext } from '../context'
import { supabase } from '@/lib/supabase/client'
import { i18n } from '../i18n'

// /cancel — exits any in-progress action and returns the user to a stable state.
//
// During profile editing (edit_mode=true): discards changes, returns to 'complete'.
// During first onboarding (never completed): resets to 'language' step.
// When idle (onboarding complete, not editing): informs user there's nothing to cancel.
export async function handleCancel(ctx: BotContext) {
  if (!ctx.dbUser) return

  const s = i18n(ctx.dbUser.language)
  const step = ctx.dbUser.onboarding_step

  if (step === 'complete' && !ctx.dbUser.edit_mode) {
    // Nothing in progress
    await ctx.reply(s.cancel_ok, { reply_markup: { remove_keyboard: true } })
    return
  }

  if (ctx.dbUser.edit_mode) {
    // Cancel profile edit — return to complete without saving
    await supabase
      .from('users')
      .update({ onboarding_step: 'complete', edit_mode: false })
      .eq('id', ctx.dbUser.id)

    await ctx.reply(s.cancel_ok, { reply_markup: { remove_keyboard: true } })
    return
  }

  // Cancel mid-first-onboarding — reset to beginning
  await supabase
    .from('users')
    .update({ onboarding_step: 'language', edit_mode: false })
    .eq('id', ctx.dbUser.id)

  await ctx.reply(s.cancel_onboarding, { reply_markup: { remove_keyboard: true } })
}
