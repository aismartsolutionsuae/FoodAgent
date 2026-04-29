import type { BotContext } from '../context'
import { supabase } from '@/lib/supabase/client'
import { i18n, languageLabel } from '../i18n'
import { buildProfileEditKeyboard, buildCuisineKeyboard, buildStopListKeyboard,
         buildGoalKeyboard, buildLanguageKeyboard,
         buildPlatformsKeyboard, buildRatingKeyboard, ALL_PLATFORMS } from '../keyboards'
import type { OnboardingStep } from '@/lib/supabase/types'

// ── /profile command ───────────────────────────────────────────────────────────
export async function handleProfileCommand(ctx: BotContext) {
  if (!ctx.dbUser) return

  const s = i18n(ctx.dbUser.language)
  const { data: pref } = await supabase
    .from('preferences')
    .select('*')
    .eq('user_id', ctx.dbUser.id)
    .single()

  const goalLabel = pref?.goal === 'diet' ? s.goal_diet_label
    : pref?.goal === 'variety' ? s.goal_variety_label
    : pref?.goal === 'balance' ? s.goal_balance_label
    : '—'

  const { data: addresses } = await supabase
    .from('addresses')
    .select('label,address')
    .eq('user_id', ctx.dbUser.id)
    .in('label', ['home', 'work'])

  const homeAddr = addresses?.find((a) => a.label === 'home')?.address ?? null
  const workAddr = addresses?.find((a) => a.label === 'work')?.address ?? null

  const cuisines = (pref?.cuisines ?? []).join(', ') || s.no_cuisines
  const stopList = (pref?.stop_list ?? []).join(', ') || s.no_stop_list
  const activePlatforms: string[] = pref?.active_platforms ?? [...ALL_PLATFORMS]
  const platformsLine = activePlatforms
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(', ') || s.no_platforms

  const text = [
    `${s.profile_title}`,
    ``,
    `👤 ${ctx.dbUser.name ?? '—'}`,
    `🗣 ${languageLabel(ctx.dbUser.language)}`,
    `🍽️ ${cuisines}`,
    `🚫 ${stopList}`,
    `🎯 ${goalLabel}`,
    `⭐ ${pref?.min_rating ?? 4.0}+`,
    `${s.loc_home_btn}: ${homeAddr ?? s.loc_empty}`,
    `${s.loc_work_btn}: ${workAddr ?? s.loc_empty}`,
    `📱 ${platformsLine}`,
  ].join('\n')

  await ctx.reply(text, { reply_markup: buildProfileEditKeyboard(s) })
}

// ── Profile edit dispatch ─────────────────────────────────────────────────────
export async function handleProfileEditCallback(ctx: BotContext) {
  await ctx.answerCallbackQuery()
  if (!ctx.dbUser || !ctx.match) return

  const field = ctx.match[1]
  const s = i18n(ctx.dbUser.language)

  // Stateless edits — no onboarding step change needed
  if (field === 'platforms') {
    const { data: pref } = await supabase
      .from('preferences').select('active_platforms').eq('user_id', ctx.dbUser.id).single()
    const active: string[] = pref?.active_platforms ?? [...ALL_PLATFORMS]
    await ctx.reply(s.ask_platforms, { reply_markup: buildPlatformsKeyboard(s, active) })
    return
  }
  if (field === 'rating') {
    await ctx.reply(s.ask_rating, { reply_markup: buildRatingKeyboard(s) })
    return
  }

  // All other fields use the onboarding step machine
  const onboardingField = field as OnboardingStep
  await supabase
    .from('users')
    .update({ onboarding_step: onboardingField, edit_mode: true })
    .eq('id', ctx.dbUser.id)

  ctx.dbUser.onboarding_step = onboardingField
  ctx.dbUser.edit_mode = true

  switch (field) {
    case 'language':
      await ctx.reply(s.language_prompt, { reply_markup: buildLanguageKeyboard(ctx.dbUser.language) })
      break
    case 'cuisine': {
      const { data: pref } = await supabase
        .from('preferences').select('cuisines').eq('user_id', ctx.dbUser.id).single()
      await ctx.reply(s.ask_cuisine, {
        reply_markup: buildCuisineKeyboard(ctx.dbUser.language, pref?.cuisines ?? []),
      })
      break
    }
    case 'stop_list': {
      const { data: pref } = await supabase
        .from('preferences').select('stop_list').eq('user_id', ctx.dbUser.id).single()
      await ctx.reply(s.ask_stop_list, {
        reply_markup: buildStopListKeyboard(ctx.dbUser.language, pref?.stop_list ?? []),
      })
      break
    }
    case 'goal':
      await ctx.reply(s.ask_goal, { reply_markup: buildGoalKeyboard(s) })
      break
    case 'address':
      await ctx.reply(s.ask_address)
      break
  }
}

// ── Rating picker (stateless inline) ──────────────────────────────────────────
export async function handleRatingSelect(ctx: BotContext) {
  await ctx.answerCallbackQuery()
  if (!ctx.dbUser || !ctx.match) return

  const value = parseFloat(ctx.match[1])
  const s = i18n(ctx.dbUser.language)

  await supabase
    .from('preferences')
    .update({ min_rating: value })
    .eq('user_id', ctx.dbUser.id)

  await ctx.reply(s.profile_updated)
}

// ── Platform toggle (inline edit of the platforms keyboard) ───────────────────
export async function handlePlatformToggle(ctx: BotContext) {
  if (!ctx.dbUser || !ctx.match) return

  const key = ctx.match[1]
  const s = i18n(ctx.dbUser.language)

  const { data: pref } = await supabase
    .from('preferences').select('active_platforms').eq('user_id', ctx.dbUser.id).single()

  const current: string[] = pref?.active_platforms ?? [...ALL_PLATFORMS]

  // Prevent deactivating all platforms — must keep at least one
  const isOnly = current.includes(key) && current.length === 1
  if (isOnly) {
    await ctx.answerCallbackQuery({ text: '⚠️ Нужна хотя бы одна платформа', show_alert: true })
    return
  }

  const updated = current.includes(key)
    ? current.filter(p => p !== key)
    : [...current, key]

  await supabase.from('preferences').update({ active_platforms: updated }).eq('user_id', ctx.dbUser.id)
  await ctx.editMessageReplyMarkup({ reply_markup: buildPlatformsKeyboard(s, updated) })
  await ctx.answerCallbackQuery()
}

// ── Platforms done ────────────────────────────────────────────────────────────
export async function handlePlatformsDone(ctx: BotContext) {
  await ctx.answerCallbackQuery()
  if (!ctx.dbUser) return
  const s = i18n(ctx.dbUser.language)
  await ctx.reply(s.profile_updated)
}
