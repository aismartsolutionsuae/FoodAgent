import type { BotContext } from '../context'
import type { NextFunction } from 'grammy'
import { supabase } from '@/lib/supabase/client'
import { i18n } from '../i18n'
import {
  buildCuisineKeyboard,
  buildStopListKeyboard,
  buildVeganKeyboard,
  buildLightVeganKeyboard,
  buildGoalKeyboard,
  buildAddressOnboardingKeyboard,
} from '../keyboards'
import type { Goal, VeganType } from '@/lib/supabase/types'

const STRICT_VEGAN_STOP = ['meat', 'seafood', 'dairy']
const TOTAL_STEPS = 5

function prog(step: number, s: ReturnType<typeof i18n>): string {
  return s.onboarding_progress(step, TOTAL_STEPS)
}

// ── Main message router ────────────────────────────────────────────────────────
export async function handleOnboardingMessage(ctx: BotContext, next: NextFunction) {
  if (!ctx.dbUser || !ctx.message?.text) return next()

  const step = ctx.dbUser.onboarding_step
  const text = ctx.message.text.trim()

  if (step === 'name')    return handleNameText(ctx, text)
  if (step === 'address') return handleAddressText(ctx, text)
  if (step === 'complete') return next()

  const s = i18n(ctx.dbUser.language)
  await ctx.reply(s.unknown_command)
}

// ── Location message ──────────────────────────────────────────────────────────
export async function handleLocationMessage(ctx: BotContext) {
  if (!ctx.dbUser || !ctx.message?.location) return
  if (ctx.dbUser.onboarding_step !== 'address') return

  const s = i18n(ctx.dbUser.language)
  const { latitude, longitude } = ctx.message.location
  const address = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`

  await supabase.from('addresses').upsert(
    {
      user_id: ctx.dbUser.id,
      label: 'home',
      address,
      lat: latitude,
      lng: longitude,
    },
    { onConflict: 'user_id,label' },
  )

  await completeOnboarding(ctx, s)
}

// ── Name step ─────────────────────────────────────────────────────────────────
async function handleNameText(ctx: BotContext, text: string) {
  const name = text.slice(0, 64)
  const s = i18n(ctx.dbUser!.language)

  await supabase.from('users').update({ name }).eq('id', ctx.dbUser!.id)
  ctx.dbUser!.name = name

  await advanceTo(ctx, 'cuisine')
  await supabase.from('preferences').upsert({ user_id: ctx.dbUser!.id, cuisines: [] })

  await ctx.reply(`${prog(2, s)}\n\n${s.ask_cuisine}`, {
    reply_markup: buildCuisineKeyboard(ctx.dbUser!.language, []),
  })
}

// ── Cuisine toggle ─────────────────────────────────────────────────────────────
export async function handleCuisineToggle(ctx: BotContext) {
  await ctx.answerCallbackQuery()
  if (!ctx.dbUser || !ctx.match) return

  const key = ctx.match[1]
  const { data: pref } = await supabase
    .from('preferences').select('cuisines').eq('user_id', ctx.dbUser.id).single()

  const current: string[] = pref?.cuisines ?? []
  const updated = current.includes(key)
    ? current.filter((c) => c !== key)
    : [...current, key]

  await supabase.from('preferences').update({ cuisines: updated }).eq('user_id', ctx.dbUser.id)
  await ctx.editMessageReplyMarkup({
    reply_markup: buildCuisineKeyboard(ctx.dbUser.language, updated),
  })
}

// ── Cuisine done ───────────────────────────────────────────────────────────────
export async function handleCuisineDone(ctx: BotContext) {
  await ctx.answerCallbackQuery()
  if (!ctx.dbUser) return

  await advanceTo(ctx, 'stop_list')
  const s = i18n(ctx.dbUser.language)
  await ctx.reply(`${prog(3, s)}\n\n${s.ask_stop_list}`, {
    reply_markup: buildStopListKeyboard(ctx.dbUser.language, []),
  })
}

// ── Stop-list toggle ───────────────────────────────────────────────────────────
export async function handleStopToggle(ctx: BotContext) {
  await ctx.answerCallbackQuery()
  if (!ctx.dbUser || !ctx.match) return

  const key = ctx.match[1]
  const { data: pref } = await supabase
    .from('preferences').select('stop_list').eq('user_id', ctx.dbUser.id).single()

  const current: string[] = pref?.stop_list ?? []
  const updated = current.includes(key)
    ? current.filter((k) => k !== key)
    : [...current, key]

  await supabase.from('preferences').update({ stop_list: updated }).eq('user_id', ctx.dbUser.id)
  await ctx.editMessageReplyMarkup({
    reply_markup: buildStopListKeyboard(ctx.dbUser.language, updated),
  })
}

// ── Stop-list "none" ──────────────────────────────────────────────────────────
export async function handleStopNone(ctx: BotContext) {
  await ctx.answerCallbackQuery()
  if (!ctx.dbUser) return

  await supabase.from('preferences').update({ stop_list: [] }).eq('user_id', ctx.dbUser.id)
  await handleStopDone(ctx)
}

// ── Stop-list done → vegan step ───────────────────────────────────────────────
export async function handleStopDone(ctx: BotContext) {
  await ctx.answerCallbackQuery().catch(() => {})
  if (!ctx.dbUser) return

  await advanceTo(ctx, 'vegan')
  const s = i18n(ctx.dbUser.language)
  await ctx.reply(`${prog(4, s)}\n\n${s.ask_vegan}`, { reply_markup: buildVeganKeyboard(s) })
}

// ── Vegan type selection ───────────────────────────────────────────────────────
export async function handleVeganSelect(ctx: BotContext) {
  await ctx.answerCallbackQuery()
  if (!ctx.dbUser || !ctx.match) return

  const veganType = ctx.match[1] as VeganType
  const s = i18n(ctx.dbUser.language)

  const { data: pref } = await supabase
    .from('preferences').select('stop_list').eq('user_id', ctx.dbUser.id).single()
  const currentStop: string[] = pref?.stop_list ?? []

  if (veganType === 'strict') {
    const merged = Array.from(new Set([...currentStop, ...STRICT_VEGAN_STOP]))
    await supabase
      .from('preferences')
      .update({ vegan_type: 'strict', stop_list: merged })
      .eq('user_id', ctx.dbUser.id)
    await finishVegan(ctx, s)

  } else if (veganType === 'light') {
    await supabase
      .from('preferences')
      .update({ vegan_type: 'light' })
      .eq('user_id', ctx.dbUser.id)
    await advanceTo(ctx, 'light_vegan')
    await ctx.reply(`${prog(4, s)}\n\n${s.ask_light_vegan}`, {
      reply_markup: buildLightVeganKeyboard(ctx.dbUser.language, currentStop),
    })

  } else {
    const cleaned = currentStop.filter((k) => !STRICT_VEGAN_STOP.includes(k))
    await supabase
      .from('preferences')
      .update({ vegan_type: 'none', stop_list: cleaned })
      .eq('user_id', ctx.dbUser.id)
    await finishVegan(ctx, s)
  }
}

// ── Light-vegan toggle ─────────────────────────────────────────────────────────
export async function handleLightVeganToggle(ctx: BotContext) {
  await ctx.answerCallbackQuery()
  if (!ctx.dbUser || !ctx.match) return

  const key = ctx.match[1]
  const { data: pref } = await supabase
    .from('preferences').select('stop_list').eq('user_id', ctx.dbUser.id).single()

  const current: string[] = pref?.stop_list ?? []
  const updated = current.includes(key)
    ? current.filter((k) => k !== key)
    : [...current, key]

  await supabase.from('preferences').update({ stop_list: updated }).eq('user_id', ctx.dbUser.id)
  await ctx.editMessageReplyMarkup({
    reply_markup: buildLightVeganKeyboard(ctx.dbUser.language, updated),
  })
}

// ── Light-vegan done ───────────────────────────────────────────────────────────
export async function handleLightVeganDone(ctx: BotContext) {
  await ctx.answerCallbackQuery()
  if (!ctx.dbUser) return
  const s = i18n(ctx.dbUser.language)
  await finishVegan(ctx, s)
}

// After vegan: go to goal (onboarding) or back to profile (edit mode)
async function finishVegan(ctx: BotContext, s: ReturnType<typeof i18n>) {
  if (ctx.dbUser!.edit_mode) {
    await supabase
      .from('users')
      .update({ onboarding_step: 'complete', edit_mode: false })
      .eq('id', ctx.dbUser!.id)
    ctx.dbUser!.onboarding_step = 'complete'
    ctx.dbUser!.edit_mode = false
    await ctx.reply(s.profile_updated)
  } else {
    await advanceTo(ctx, 'goal')
    await ctx.reply(`${prog(5, s)}\n\n${s.ask_goal}`, { reply_markup: buildGoalKeyboard(s) })
  }
}

// ── Goal callback → address step (soft) ───────────────────────────────────────
export async function handleGoalSelect(ctx: BotContext) {
  await ctx.answerCallbackQuery()
  if (!ctx.dbUser || !ctx.match) return

  const goal = ctx.match[1] as Goal
  const s = i18n(ctx.dbUser.language)
  const isEditMode = ctx.dbUser.edit_mode

  await supabase.from('preferences').update({ goal }).eq('user_id', ctx.dbUser.id)

  if (isEditMode) {
    await supabase
      .from('users')
      .update({ onboarding_step: 'complete', edit_mode: false })
      .eq('id', ctx.dbUser.id)
    ctx.dbUser.onboarding_step = 'complete'
    ctx.dbUser.edit_mode = false
    await ctx.reply(s.profile_updated)
  } else {
    // Soft address request before completing onboarding
    await advanceTo(ctx, 'address')
    await ctx.reply(s.ask_address_soft, {
      reply_markup: buildAddressOnboardingKeyboard(s),
    })
  }
}

// ── Address soft step — user tapped "Set area" → we showed ask_address already,
//    now waiting for text input
export async function handleOnboardingSetArea(ctx: BotContext) {
  await ctx.answerCallbackQuery()
  if (!ctx.dbUser) return

  const s = i18n(ctx.dbUser.language)
  await ctx.reply(s.ask_address)
}

// ── Address text input (onboarding and profile edit) ──────────────────────────
async function handleAddressText(ctx: BotContext, text: string) {
  const s = i18n(ctx.dbUser!.language)

  await supabase.from('addresses').upsert(
    { user_id: ctx.dbUser!.id, label: 'home', address: text },
    { onConflict: 'user_id,label' },
  )

  if (ctx.dbUser!.edit_mode) {
    await supabase.from('users')
      .update({ onboarding_step: 'complete', edit_mode: false })
      .eq('id', ctx.dbUser!.id)
    ctx.dbUser!.onboarding_step = 'complete'
    ctx.dbUser!.edit_mode = false
    await ctx.reply(s.profile_updated)
  } else {
    await completeOnboarding(ctx, s)
  }
}

// ── Skip address → complete onboarding ────────────────────────────────────────
export async function handleSkipAddress(ctx: BotContext) {
  await ctx.answerCallbackQuery()
  if (!ctx.dbUser) return

  const s = i18n(ctx.dbUser.language)
  await completeOnboarding(ctx, s)
}

// ── Shared onboarding completion ──────────────────────────────────────────────
async function completeOnboarding(ctx: BotContext, s: ReturnType<typeof i18n>) {
  await supabase
    .from('users')
    .update({ onboarding_step: 'complete', edit_mode: false })
    .eq('id', ctx.dbUser!.id)
  ctx.dbUser!.onboarding_step = 'complete'
  ctx.dbUser!.edit_mode = false

  const name = ctx.dbUser!.name ?? ctx.from?.first_name ?? ''
  await ctx.reply(s.profile_saved(name), { reply_markup: { remove_keyboard: true } })
  await ctx.reply(s.profile_hint)
  await ctx.reply(s.commands_hint)
}

// ── Utility ───────────────────────────────────────────────────────────────────
async function advanceTo(ctx: BotContext, step: string) {
  await supabase.from('users').update({ onboarding_step: step }).eq('id', ctx.dbUser!.id)
  ctx.dbUser!.onboarding_step = step as import('@/lib/supabase/types').OnboardingStep
}
