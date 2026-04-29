import type { BotContext } from '../context'
import { i18n } from '../i18n'
import { supabase } from '@/lib/supabase/client'
import { runSearchPipeline } from '@/lib/search/pipeline'
import { detectStopListConflicts } from '@/lib/search/rank'
import { InlineKeyboard } from 'grammy'
import {
  buildOrderAreaKeyboard,
  buildOrderAreaSaveKeyboard,
  buildCurrentAreaInputKeyboard,
} from '../keyboards'
import type { RankedDish, DbPreferences } from '@/lib/supabase/types'
import type { KbjuResult } from '@/lib/search/kbju'

interface SearchOpts {
  ignoreCuisineBoost?: boolean
  noFilters?: boolean
  areaOverride?: string | null
  skipAreaPrompt?: boolean
}

const inFlightSearchByUser = new Map<string, number>()
const SEARCH_LOCK_TTL_MS = 20_000
const pendingAreaModeByUser = new Map<string, 'text' | 'geo'>()
const pendingAreaSaveByUser = new Map<string, { address: string; lat: number | null; lng: number | null }>()

async function rememberLastQuery(ctx: BotContext, query: string) {
  if (!ctx.dbUser) return
  supabase.from('users').update({ last_query: query }).eq('id', ctx.dbUser.id).then(() => {})
  ctx.dbUser.last_query = query
}

async function promptDeliveryArea(ctx: BotContext, query: string) {
  if (!ctx.dbUser) return
  const s = i18n(ctx.dbUser.language)
  await rememberLastQuery(ctx, query)
  pendingAreaModeByUser.delete(ctx.dbUser.id)
  pendingAreaSaveByUser.delete(ctx.dbUser.id)

  const { data: addresses } = await supabase
    .from('addresses')
    .select('label,address')
    .eq('user_id', ctx.dbUser.id)
    .in('label', ['home', 'work'])

  const homeAddress = addresses?.find((a) => a.label === 'home')?.address ?? null
  const workAddress = addresses?.find((a) => a.label === 'work')?.address ?? null
  await ctx.reply(s.ask_location, { reply_markup: buildOrderAreaKeyboard(s, homeAddress, workAddress) })
}

async function promptSaveCurrentArea(
  ctx: BotContext,
  area: { address: string; lat: number | null; lng: number | null },
) {
  if (!ctx.dbUser) return
  const s = i18n(ctx.dbUser.language)
  pendingAreaSaveByUser.set(ctx.dbUser.id, area)
  await ctx.reply(s.loc_save_prompt, { reply_markup: buildOrderAreaSaveKeyboard(s) })
}

// Top-level handler — call from text messages, voice transcriptions, and "Surprise me"
export async function handleFoodSearch(ctx: BotContext, query: string, opts: SearchOpts = {}) {
  if (!ctx.dbUser) return

  if (!opts.skipAreaPrompt && opts.areaOverride === undefined) {
    await promptDeliveryArea(ctx, query)
    return
  }

  const s = i18n(ctx.dbUser.language)
  const userId = ctx.dbUser.id
  const now = Date.now()
  const activeSince = inFlightSearchByUser.get(userId)

  // Prevent duplicate updates from spawning parallel expensive pipelines.
  if (activeSince && now - activeSince < SEARCH_LOCK_TTL_MS) return
  inFlightSearchByUser.set(userId, now)

  const loadingMsg = await ctx.reply(s.searching)

  try {
    const { data: prefs } = await supabase
      .from('preferences')
      .select('*')
      .eq('user_id', ctx.dbUser.id)
      .single()

    if (!prefs) {
      await ctx.api.deleteMessage(ctx.chat!.id, loadingMsg.message_id).catch(() => {})
      await ctx.reply(s.search_error_fallback)
      return
    }

    await rememberLastQuery(ctx, query)

    const result = await runSearchPipeline({
      query,
      userId: ctx.dbUser.id,
      lang: ctx.dbUser.language,
      prefs: prefs as DbPreferences,
      area: opts.areaOverride ?? null,
      ignoreCuisineBoost: opts.ignoreCuisineBoost,
      noFilters: opts.noFilters,
    })

    await ctx.api.deleteMessage(ctx.chat!.id, loadingMsg.message_id).catch(() => {})

    if (result.dishes.length === 0) {
      await ctx.reply(s.no_results_fallback, {
        reply_markup: new InlineKeyboard()
          .text(s.retry_btn, 'retry_search').row()
          .text(s.search_no_filters_btn, 'search_no_filters'),
      })
      return
    }

    const actionableDishes = result.dishes.filter(isActionableDish)
    if (actionableDishes.length === 0) {
      await ctx.reply(s.no_actionable_results, {
        reply_markup: new InlineKeyboard()
          .text(s.retry_btn, 'retry_search').row()
          .text(s.search_no_filters_btn, 'search_no_filters'),
      })
      return
    }

    // Stop-list conflict on top result
    const top = actionableDishes[0]
    const conflicts = detectStopListConflicts(top.name, prefs.stop_list as string[])
    if (conflicts.length > 0 && !result.parsed.explicitRestaurant) {
      await ctx.reply(s.conflict_prompt(top.name, conflicts[0]), {
        reply_markup: new InlineKeyboard()
          .text(s.conflict_bypass_btn, 'conflict:bypass').row()
          .text(s.conflict_stop_btn,   `conflict:remove_stop:${conflicts[0]}`),
      })
      return
    }

    const top3 = actionableDishes.slice(0, 3)
    const text = formatResults(top3, result.kbju, s, result.fromCache)
    const keyboard = buildResultsKeyboard(top3, s)

    await ctx.reply(text, { reply_markup: keyboard, parse_mode: 'HTML' })

  } catch (err) {
    await ctx.api.deleteMessage(ctx.chat!.id, loadingMsg.message_id).catch(() => {})
    console.error('[search]', err)
    await ctx.reply(s.search_error_fallback, {
      reply_markup: new InlineKeyboard().text(s.retry_btn, 'retry_search'),
    })
  } finally {
    inFlightSearchByUser.delete(userId)
  }
}

export async function handleOrderAreaSelection(ctx: BotContext) {
  await ctx.answerCallbackQuery()
  if (!ctx.dbUser || !ctx.match) return

  const choice = ctx.match[1]
  const s = i18n(ctx.dbUser.language)
  const query = ctx.dbUser.last_query?.trim()
  if (!query) {
    await ctx.reply(s.unknown_command)
    return
  }

  if (choice === 'home' || choice === 'work') {
    const { data: addr } = await supabase
      .from('addresses')
      .select('address')
      .eq('user_id', ctx.dbUser.id)
      .eq('label', choice)
      .maybeSingle()

    if (!addr?.address) {
      pendingAreaModeByUser.delete(ctx.dbUser.id)
      await ctx.reply(s.ask_address_mode, { reply_markup: buildCurrentAreaInputKeyboard(s) })
      return
    }

    pendingAreaModeByUser.delete(ctx.dbUser.id)
    await handleFoodSearch(ctx, query, { areaOverride: addr.address, skipAreaPrompt: true })
    return
  }

  if (choice === 'current_text') {
    pendingAreaModeByUser.set(ctx.dbUser.id, 'text')
    await ctx.reply(`${s.ask_address}`)
    return
  }

  if (choice === 'current_geo') {
    pendingAreaModeByUser.set(ctx.dbUser.id, 'geo')
    await ctx.reply(`${s.ask_address}\n\n${s.loc_pin_btn}`)
  }
}

export async function handleOrderAreaSaveSelection(ctx: BotContext) {
  await ctx.answerCallbackQuery()
  if (!ctx.dbUser || !ctx.match) return

  const saveChoice = ctx.match[1]
  if (saveChoice === 'skip') {
    pendingAreaSaveByUser.delete(ctx.dbUser.id)
    return
  }

  const pendingArea = pendingAreaSaveByUser.get(ctx.dbUser.id)
  if (!pendingArea) return

  await supabase.from('addresses').upsert(
    {
      user_id: ctx.dbUser.id,
      label: saveChoice,
      address: pendingArea.address,
      lat: pendingArea.lat,
      lng: pendingArea.lng,
    },
    { onConflict: 'user_id,label' },
  )
  pendingAreaSaveByUser.delete(ctx.dbUser.id)
  const s = i18n(ctx.dbUser.language)
  await ctx.reply(s.loc_saved)
}

export async function maybeHandleCurrentAreaText(ctx: BotContext, text: string): Promise<boolean> {
  if (!ctx.dbUser || ctx.dbUser.onboarding_step !== 'complete') return false
  const mode = pendingAreaModeByUser.get(ctx.dbUser.id)
  if (mode !== 'text') return false

  pendingAreaModeByUser.delete(ctx.dbUser.id)
  const query = ctx.dbUser.last_query?.trim()
  if (!query) return true

  const address = text.trim()
  await handleFoodSearch(ctx, query, { areaOverride: address, skipAreaPrompt: true })
  await promptSaveCurrentArea(ctx, { address, lat: null, lng: null })
  return true
}

export async function maybeHandleCurrentAreaLocation(ctx: BotContext): Promise<boolean> {
  if (!ctx.dbUser || !ctx.message?.location || ctx.dbUser.onboarding_step !== 'complete') return false
  const mode = pendingAreaModeByUser.get(ctx.dbUser.id)
  if (mode !== 'geo') return false

  pendingAreaModeByUser.delete(ctx.dbUser.id)
  const query = ctx.dbUser.last_query?.trim()
  if (!query) return true

  const { latitude, longitude } = ctx.message.location
  const area = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
  await handleFoodSearch(ctx, query, { areaOverride: area, skipAreaPrompt: true })
  await promptSaveCurrentArea(ctx, { address: area, lat: latitude, lng: longitude })
  return true
}

function formatResults(
  dishes: RankedDish[],
  kbju: KbjuResult | null,
  s: ReturnType<typeof i18n>,
  fromCache: boolean,
): string {
  const lines: string[] = []

  dishes.forEach((dish, i) => {
    const preferred = dish.isPreferred ? ' ⭐' : ''
    const rating = dish.rating !== null ? ` ${dish.rating}★` : ''
    const hasPrice = dish.total > 0 || dish.price > 0
    const priceLine = hasPrice
      ? `💰 ${dish.total} AED (блюдо ${dish.price} + доставка ${dish.delivery_fee} + сбор ${dish.service_fee})`
      : `💰 Цена уточняется (нужно открыть меню ресторана)`
    lines.push(
      `<b>${i + 1}. ${dish.name}</b>${preferred}\n` +
      `📍 ${dish.restaurant}${rating} · ${dish.platform}\n` +
      priceLine
    )
  })

  if (kbju) {
    lines.push(
      `\n🥗 <b>КБЖУ (топ блюдо):</b> ${kbju.calories} ккал · Б ${kbju.protein}г · Ж ${kbju.fat}г · У ${kbju.carbs}г`
    )
  }

  if (fromCache) lines.push('\n<i>⚡ Из кэша</i>')

  return lines.join('\n\n')
}

function buildResultsKeyboard(dishes: RankedDish[], s: ReturnType<typeof i18n>): InlineKeyboard {
  const kb = new InlineKeyboard()
  dishes.forEach((dish, i) => {
    kb.url(`${i + 1}. ${s.order_btn}`, dish.deep_link)
    if (i < dishes.length - 1) kb.row()
  })
  kb.row().text(`🎲 ${s.surprise_btn}`, 'search_surprise')
  return kb
}

function isActionableDish(dish: RankedDish): boolean {
  const hasPrice = dish.total > 0 || dish.price > 0
  const hasUrl = typeof dish.deep_link === 'string' && dish.deep_link.startsWith('http')
  const pointsToSearchPage = /\/(search|restaurants)(\?|$)/i.test(dish.deep_link)
  return hasPrice && hasUrl && !pointsToSearchPage
}
