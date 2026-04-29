import { InlineKeyboard } from 'grammy'
import { CUISINES, STOP_LIST_OPTIONS, LIGHT_VEGAN_OPTIONS, i18n, type Strings } from './i18n'
import type { Language } from '@/lib/supabase/types'

// Language picker — labels shown in the user's currently selected language
export function buildLanguageKeyboard(lang: Language | null | undefined): InlineKeyboard {
  const s = i18n(lang)
  return new InlineKeyboard()
    .text(s.lang_ru_btn, 'lang:ru').row()
    .text(s.lang_en_btn, 'lang:en').row()
    .text(s.lang_ar_btn, 'lang:ar')
}

// Builds cuisine multi-select keyboard.
// Selected cuisines show ✅ prefix.
export function buildCuisineKeyboard(lang: Language, selected: string[]): InlineKeyboard {
  const options = CUISINES[lang] ?? CUISINES.ru
  const keyboard = new InlineKeyboard()
  const s = i18n(lang)

  options.forEach((opt, i) => {
    const isSelected = selected.includes(opt.key)
    const label = isSelected ? `✅ ${opt.label.replace(/^\S+\s/, '')}` : opt.label
    keyboard.text(label, `toggle_cuisine:${opt.key}`)
    if ((i + 1) % 2 === 0) keyboard.row()
  })

  keyboard.row().text(s.cuisine_done_btn, 'cuisine_done')
  return keyboard
}

// Builds stop-list multi-select keyboard.
export function buildStopListKeyboard(lang: Language, selected: string[]): InlineKeyboard {
  const options = STOP_LIST_OPTIONS[lang] ?? STOP_LIST_OPTIONS.ru
  const keyboard = new InlineKeyboard()
  const s = i18n(lang)

  options.forEach((opt, i) => {
    const isSelected = selected.includes(opt.key)
    const label = isSelected ? `✅ ${opt.label.replace(/^\S+\s/, '')}` : opt.label
    keyboard.text(label, `toggle_stop:${opt.key}`)
    if ((i + 1) % 2 === 0) keyboard.row()
  })

  keyboard.row()
    .text(s.none_btn, 'stop_none')
    .row()
    .text(s.cuisine_done_btn, 'stop_done')

  return keyboard
}

// Vegan / diet type selection
export function buildVeganKeyboard(s: Strings): InlineKeyboard {
  return new InlineKeyboard()
    .text(s.vegan_none_btn,   'vegan:none').row()
    .text(s.vegan_strict_btn, 'vegan:strict').row()
    .text(s.vegan_light_btn,  'vegan:light')
}

// Light-vegan animal product checklist (reuses stop_list keys)
export function buildLightVeganKeyboard(lang: Language, selected: string[]): InlineKeyboard {
  const options = LIGHT_VEGAN_OPTIONS[lang] ?? LIGHT_VEGAN_OPTIONS.ru
  const keyboard = new InlineKeyboard()
  const s = i18n(lang)

  options.forEach((opt, i) => {
    const isSelected = selected.includes(opt.key)
    const label = isSelected ? `✅ ${opt.label.replace(/^\S+\s/, '')}` : opt.label
    keyboard.text(label, `toggle_lvegan:${opt.key}`)
    if ((i + 1) % 2 === 0) keyboard.row()
  })

  keyboard.row().text(s.lvegan_done_btn, 'lvegan_done')
  return keyboard
}

// Goal selection
export function buildGoalKeyboard(s: Strings): InlineKeyboard {
  return new InlineKeyboard()
    .text(s.goal_diet_btn, 'goal:diet').row()
    .text(s.goal_variety_btn, 'goal:variety').row()
    .text(s.goal_balance_btn, 'goal:balance')
}

// Profile edit menu
export function buildProfileEditKeyboard(s: Strings): InlineKeyboard {
  return new InlineKeyboard()
    .text(s.edit_language_btn,  'profile_edit:language')
    .text(s.edit_cuisine_btn,   'profile_edit:cuisine').row()
    .text(s.edit_stoplist_btn,  'profile_edit:stop_list').row()
    .text(s.edit_goal_btn,      'profile_edit:goal')
    .text(s.edit_platforms_btn, 'profile_edit:platforms').row()
    .text(s.edit_address_btn,   'profile_edit:address')
    .text(s.edit_rating_btn,    'profile_edit:rating')
}

// Minimum restaurant rating picker
export function buildRatingKeyboard(_s: Strings): InlineKeyboard {
  return new InlineKeyboard()
    .text('⭐ 3.5+', 'rating:3.5')
    .text('⭐ 4.0+', 'rating:4.0').row()
    .text('⭐ 4.5+', 'rating:4.5')
    .text('🌍 Любой', 'rating:0')
}

const PLATFORM_LABELS: Record<string, string> = {
  talabat:   'Talabat',
  deliveroo: 'Deliveroo',
}

export const ALL_PLATFORMS = ['talabat', 'deliveroo'] as const

// Platform on/off toggles — active platforms show ✅
export function buildPlatformsKeyboard(s: Strings, active: string[]): InlineKeyboard {
  const kb = new InlineKeyboard()
  ALL_PLATFORMS.forEach((key, i) => {
    const on = active.includes(key)
    const label = on ? `✅ ${PLATFORM_LABELS[key]}` : PLATFORM_LABELS[key]
    kb.text(label, `toggle_platform:${key}`)
    if (i < ALL_PLATFORMS.length - 1) kb.row()
  })
  kb.row().text(s.cuisine_done_btn, 'platforms_done')
  return kb
}

// Soft address request at end of onboarding
export function buildAddressOnboardingKeyboard(s: Strings): InlineKeyboard {
  return new InlineKeyboard()
    .text(s.set_area_btn, 'onboarding_set_area').row()
    .text(s.skip_btn,     'skip_address')
}

function compactAddress(value: string | null | undefined, s: Strings): string {
  if (!value) return s.loc_empty
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized.length > 20 ? `${normalized.slice(0, 20)}…` : normalized
}

// Per-order delivery area picker (before running search).
export function buildOrderAreaKeyboard(
  s: Strings,
  homeAddress?: string | null,
  workAddress?: string | null,
): InlineKeyboard {
  const homeLabel = `${s.loc_home_btn}: ${compactAddress(homeAddress, s)}`
  const workLabel = `${s.loc_work_btn}: ${compactAddress(workAddress, s)}`

  return new InlineKeyboard()
    .text(homeLabel, 'order_area:home').row()
    .text(workLabel, 'order_area:work').row()
    .text(s.loc_other_btn, 'order_area:current_text')
    .text(s.loc_pin_btn, 'order_area:current_geo')
}

// Optional save prompt for ad-hoc address used in search.
export function buildOrderAreaSaveKeyboard(s: Strings): InlineKeyboard {
  return new InlineKeyboard()
    .text(s.loc_save_home_btn, 'order_area_save:home')
    .text(s.loc_save_work_btn, 'order_area_save:work').row()
    .text(s.loc_no_save_btn, 'order_area_save:skip')
}

// Ask user to choose how to provide a one-time current address.
export function buildCurrentAreaInputKeyboard(s: Strings): InlineKeyboard {
  return new InlineKeyboard()
    .text(s.type_address_btn, 'order_area:current_text')
    .text(s.share_location_btn, 'order_area:current_geo')
}

// Search result retry / no-filters options
export function buildRetryKeyboard(s: Strings): InlineKeyboard {
  return new InlineKeyboard()
    .text(s.retry_btn,            'retry_search').row()
    .text(s.search_no_filters_btn, 'search_no_filters')
}

// Stop-list conflict — shown when a requested dish conflicts with stop list
export function buildConflictKeyboard(s: Strings): InlineKeyboard {
  return new InlineKeyboard()
    .text(s.conflict_bypass_btn, 'conflict:bypass').row()
    .text(s.conflict_stop_btn,   'conflict:remove_stop')
}

// Price alert dismiss button
export function buildDismissKeyboard(s: Strings): InlineKeyboard {
  return new InlineKeyboard()
    .text(s.dismiss_alert_btn, 'dismiss_alert')
}
