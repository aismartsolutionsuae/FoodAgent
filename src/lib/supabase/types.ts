export type Language = 'ru' | 'en' | 'ar'

export type OnboardingStep =
  | 'language'
  | 'name'
  | 'cuisine'
  | 'stop_list'
  | 'vegan'
  | 'light_vegan'
  | 'goal'
  | 'address'
  | 'complete'

export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled'

export type Goal = 'diet' | 'variety' | 'balance'
export type SweetPref = 'loves' | 'avoids' | 'neutral'
export type VeganType = 'none' | 'strict' | 'light'
export type AddressMode = 'saved' | 'each_time'

export interface DbUser {
  id: string
  telegram_id: number
  name: string | null
  language: Language
  onboarding_step: OnboardingStep
  edit_mode: boolean
  created_at: string
  last_query: string | null
}

export interface DbAddress {
  id: string
  user_id: string
  label: string
  address: string
  lat: number | null
  lng: number | null
}

export interface DbPreferences {
  id: string
  user_id: string
  cuisines: string[]
  stop_list: string[]
  dietary_markers: string[]
  goal: Goal | null
  sweet_pref: SweetPref | null
  vegan_type: VeganType | null
  address_mode: AddressMode
  preferred_restaurants: string[]
  restaurant_stop_list: string[]
  active_platforms: string[]
  min_rating: number
}

export interface DbSubscription {
  id: string
  user_id: string
  trial_started_at: string
  trial_expires_at: string
  status: SubscriptionStatus
  ls_subscription_id: string | null
  ls_customer_id: string | null
  current_period_end: string | null
}

export interface DbPriceCache {
  id: string
  query_hash: string
  platform: string
  results: DishResult[]
  created_at: string
  expires_at: string
}

export interface DishResult {
  name: string
  restaurant: string
  price: number
  delivery_fee: number
  service_fee: number
  total: number
  rating: number | null
  deep_link: string
  platform: string
}

export interface RankedDish extends DishResult {
  isPreferred: boolean
  isCuisineMatch: boolean
}
