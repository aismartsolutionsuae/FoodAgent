import type { DishResult, RankedDish, DbPreferences } from '@/lib/supabase/types'
import type { ParsedQuery } from './parse'

export interface RankOptions {
  prefs: DbPreferences
  parsed: ParsedQuery
  ignoreCuisineBoost?: boolean  // "Surprise me" — sort only by preferred + price
  noFilters?: boolean           // ignore profile-level hard filters
}

// Returns results filtered by hard rules, then sorted by:
// 1. isPreferred (5-star feedback restaurants)
// 2. isCuisineMatch (user's favourite cuisines bubble up, but nothing is hidden)
// 3. total price ascending
export function rankResults(results: DishResult[], opts: RankOptions): RankedDish[] {
  const { prefs, parsed, ignoreCuisineBoost = false, noFilters = false } = opts

  const allowedPlatforms = parsed.platform
    ? [parsed.platform]
    : noFilters
    ? ['talabat', 'deliveroo']
    : prefs.active_platforms.length > 0
    ? prefs.active_platforms
    : ['talabat', 'deliveroo']

  const effectiveStopList = [
    ...prefs.stop_list,
    ...parsed.excludeItems.map(i => i.toLowerCase()),
  ]

  // ── Hard filters (things that are truly excluded) ──────────────────────────
  const filtered = results.filter(dish => {
    if (!allowedPlatforms.includes(dish.platform)) return false
    if (!noFilters && dish.rating !== null && dish.rating < prefs.min_rating) return false

    const restaurantLower = dish.restaurant.toLowerCase()
    if (!noFilters && prefs.restaurant_stop_list.some(r => restaurantLower.includes(r.toLowerCase()))) return false

    if (parsed.explicitRestaurant) {
      if (!restaurantLower.includes(parsed.explicitRestaurant.toLowerCase())) return false
    }

    if (parsed.maxPrice !== null && dish.total > parsed.maxPrice) return false

    // Stop-list: block dishes containing restricted ingredients
    // Explicit restaurant request bypasses ingredient filters (user already decided)
    if (!noFilters && !parsed.explicitRestaurant && effectiveStopList.length > 0) {
      const dishLower = dish.name.toLowerCase()
      if (effectiveStopList.some(item => dishLower.includes(item))) return false
    }

    return true
  })

  // ── Boost scoring ──────────────────────────────────────────────────────────
  const ranked: RankedDish[] = filtered.map(dish => {
    const dishLower = dish.name.toLowerCase()
    const restLower = dish.restaurant.toLowerCase()

    const isCuisineMatch = ignoreCuisineBoost || prefs.cuisines.length === 0
      ? true  // no boost active — treat all as matching
      : prefs.cuisines.some(c => {
          const cl = c.toLowerCase()
          return dishLower.includes(cl) || restLower.includes(cl)
        })

    return {
      ...dish,
      isPreferred: prefs.preferred_restaurants.some(r =>
        dish.restaurant.toLowerCase().includes(r.toLowerCase())
      ),
      isCuisineMatch,
    }
  })

  // Sort: preferred → cuisine match → cheapest
  ranked.sort((a, b) => {
    if (a.isPreferred !== b.isPreferred) return a.isPreferred ? -1 : 1
    if (a.isCuisineMatch !== b.isCuisineMatch) return a.isCuisineMatch ? -1 : 1
    return a.total - b.total
  })

  return ranked
}

// Returns stop-list keys that appear in the dish name (for conflict detection)
export function detectStopListConflicts(dishName: string, stopList: string[]): string[] {
  const lower = dishName.toLowerCase()
  return stopList.filter(item => lower.includes(item.toLowerCase()))
}
