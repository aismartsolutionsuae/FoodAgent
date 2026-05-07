import crypto from 'crypto'
import { supabase } from '@/lib/supabase/client'
import { notifyOwner } from '@/lib/notify'
import { parseQuery, type ParsedQuery } from './parse'
import { rankResults } from './rank'
import { estimateKbju, type KbjuResult } from './kbju'
import type { DishResult, RankedDish, DbPreferences } from '@/lib/supabase/types'
import type { Language } from '@/lib/supabase/types'

export interface SearchParams {
  query: string
  userId: string
  lang: Language
  prefs: DbPreferences
  area: string | null           // delivery area from saved address or per-search input
  ignoreCuisineBoost?: boolean  // "Surprise me" — skip cuisine boost in ranking
  noFilters?: boolean           // "Search without filters" — ignore profile hard filters
}

export interface SearchResult {
  dishes: RankedDish[]
  kbju: KbjuResult | null  // for top dish only
  parsed: ParsedQuery
  fromCache: boolean
}

function hashQuery(dish: string, area: string | null): string {
  return crypto.createHash('md5').update(`${dish}|${area ?? ''}`).digest('hex')
}

function cachePlatformKey(platforms: string[]): string {
  // Keep cache schema compatible with single-platform enum/check constraints in DB.
  if (platforms.includes('talabat')) return 'talabat'
  if (platforms.includes('deliveroo')) return 'deliveroo'
  return 'talabat'
}

// Returns plausible mock dishes for development testing (SCRAPER_MOCK=true).
function mockResults(dish: string): DishResult[] {
  const d = dish.length > 0 ? dish : 'Блюдо'
  return [
    {
      name: `${d} (Special)`,
      restaurant: 'Zaatar w Zeit',
      price: 36,
      delivery_fee: 5,
      service_fee: 2,
      total: 43,
      rating: 4.6,
      deep_link: 'https://www.talabat.com/uae/zaatar-w-zeit/1234',
      platform: 'talabat',
    },
    {
      name: `${d} Platter`,
      restaurant: 'Operation:Falafel',
      price: 42,
      delivery_fee: 4,
      service_fee: 2,
      total: 48,
      rating: 4.4,
      deep_link: 'https://www.talabat.com/uae/operation-falafel/5678',
      platform: 'talabat',
    },
    {
      name: `${d} Bowl`,
      restaurant: 'Comptoir Libanais',
      price: 55,
      delivery_fee: 8,
      service_fee: 3,
      total: 66,
      rating: 4.7,
      deep_link: 'https://deliveroo.ae/menu/comptoir-libanais-dubai-marina',
      platform: 'deliveroo',
    },
  ]
}

// Calls Railway Playwright worker to scrape platforms.
async function fetchFromWorker(
  dish: string,
  area: string | null,
  platforms: string[],
  timeoutMs = 16_000,
): Promise<DishResult[]> {
  // Development mock — set SCRAPER_MOCK=true in .env.local to bypass the real worker
  if (process.env.SCRAPER_MOCK === 'true') {
    console.log('[pipeline] SCRAPER_MOCK=true — returning mock results')
    return mockResults(dish)
  }

  const workerUrl = process.env.SCRAPER_WORKER_URL
  const secret = process.env.SCRAPER_WORKER_SECRET

  if (!workerUrl) throw new Error('SCRAPER_WORKER_URL not configured')

  const resp = await fetch(`${workerUrl}/scrape`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-worker-secret': secret ?? '',
    },
    body: JSON.stringify({ dish, area, platforms }),
    signal: AbortSignal.timeout(timeoutMs),
  })

  if (!resp.ok) {
    throw new Error(`Worker responded ${resp.status}: ${await resp.text()}`)
  }

  return (await resp.json()) as DishResult[]
}

export async function runSearchPipeline(params: SearchParams): Promise<SearchResult> {
  const { query, userId, lang, prefs, area, ignoreCuisineBoost = false, noFilters = false } = params

  // Step 1 — parse natural-language query (cuisine + goal prefs hint GPT)
  const parsed = await parseQuery(query, lang, prefs.cuisines ?? [], prefs.goal ?? undefined)

  // Determine effective platforms (query override > prefs > default)
  const platforms = parsed.platform
    ? [parsed.platform]
    : prefs.active_platforms.length > 0
    ? prefs.active_platforms
    : ['talabat', 'deliveroo']
  const cachePlatform = cachePlatformKey(platforms)

  // Step 2 — check price cache
  const queryHash = hashQuery(parsed.dish, area)
  const { data: cached } = await supabase
    .from('price_cache')
    .select('results')
    .eq('query_hash', queryHash)
    .eq('platform', cachePlatform)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  let rawResults: DishResult[]
  let fromCache = false

  if (cached?.results && Array.isArray(cached.results)) {
    rawResults = cached.results as DishResult[]
    fromCache = true
  } else {
    // Step 3 — call Railway worker
    try {
      rawResults = await fetchFromWorker(parsed.dish, area, platforms, 16_000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      await notifyOwner(`Scraper error for query "${parsed.dish}"\n${msg}`)
      throw err
    }

    // Step 4 — store in cache (15 min TTL)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    await supabase.from('price_cache').upsert(
      {
        query_hash: queryHash,
        platform: cachePlatform,
        results: rawResults,
        expires_at: expiresAt,
      },
      { onConflict: 'query_hash,platform' },
    )
  }

  // Step 5 — rank with user rules (cuisine is a boost, not a filter — nothing is hidden)
  const ranked = rankResults(rawResults, { prefs, parsed, ignoreCuisineBoost, noFilters })

  // Step 6 — KBJU for top result
  const kbju = ranked.length > 0 ? await estimateKbju(ranked[0]) : null

  // Step 7 — save to search history
  await supabase.from('search_history').insert({
    user_id: userId,
    query,
    results_snapshot: ranked.slice(0, 10),
  }).then(() => {})

  return { dishes: ranked, kbju, parsed, fromCache }
}
