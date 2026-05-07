// Re-exports from @portfolio/database.
// This file stays so existing @/lib/supabase/types imports continue to work.
export type {
  Language,
  OnboardingStep,
  SubscriptionStatus,
  Goal,
  SweetPref,
  VeganType,
  AddressMode,
  DbUser,
  DbAddress,
  DbPreferences,
  DbSubscription,
  DbPriceCache,
  DishResult,
  RankedDish,
} from '@portfolio/database'
