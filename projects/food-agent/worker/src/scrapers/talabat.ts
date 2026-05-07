import { type BrowserContext, type Page } from 'playwright'
import { getBrowser, UA } from '../browser'
import type { DishResult } from '../types'

const BASE = 'https://www.talabat.com/uae'
const MAX_ITEMS = 10
const RESTAURANTS_URL = `${BASE}/restaurants`
const MAX_RESTAURANT_CRAWL = 3

function toNumber(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const m = v.match(/(\d+\.?\d*)/)
    if (m) return parseFloat(m[1])
  }
  return 0
}

function toRating(v: unknown): number | null {
  const n = toNumber(v)
  return n > 0 ? n : null
}

function normalizeLink(link: string | null | undefined): string {
  if (!link) return BASE
  if (link.startsWith('http://') || link.startsWith('https://')) return link
  if (link.startsWith('/')) return `https://www.talabat.com${link}`
  return BASE
}

function dedupe(items: DishResult[]): DishResult[] {
  const seen = new Set<string>()
  return items.filter((x) => {
    const key = `${x.platform}|${x.restaurant}|${x.name}|${x.total}|${x.deep_link}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function dishTokens(dish: string): string[] {
  return dish
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((x) => x.length >= 3)
}

function scoreDishMatch(name: string, dish: string): number {
  const tokens = dishTokens(dish)
  if (tokens.length === 0) return 0
  const lower = name.toLowerCase()
  return tokens.reduce((acc, token) => acc + (lower.includes(token) ? 1 : 0), 0)
}

function isActionableLink(link: string): boolean {
  if (!link || link === BASE) return false
  if (!/^https?:\/\//i.test(link)) return false
  return !/\/(search|restaurants)(\?|$)/i.test(link)
}

function isActionableDish(item: DishResult): boolean {
  return item.total > 0 && isActionableLink(item.deep_link)
}

function extractFromJson(node: unknown, dish: string): DishResult[] {
  const out: DishResult[] = []
  const stack: unknown[] = [node]

  while (stack.length > 0) {
    const cur = stack.pop()
    if (!cur) continue

    if (Array.isArray(cur)) {
      for (const x of cur) stack.push(x)
      continue
    }

    if (typeof cur !== 'object') continue
    const obj = cur as Record<string, unknown>

    const name =
      (obj.name as string | undefined) ||
      (obj.title as string | undefined) ||
      (obj.displayName as string | undefined) ||
      dish

    const restaurant =
      (obj.restaurantName as string | undefined) ||
      (obj.vendorName as string | undefined) ||
      (obj.brandName as string | undefined) ||
      ((obj.restaurant as Record<string, unknown> | undefined)?.name as string | undefined) ||
      ((obj.vendor as Record<string, unknown> | undefined)?.name as string | undefined) ||
      ''

    const price =
      toNumber((obj.price as Record<string, unknown> | undefined)?.amount) ||
      toNumber((obj.displayPrice as Record<string, unknown> | undefined)?.amount) ||
      toNumber(obj.price) ||
      toNumber(obj.amount)

    const deliveryFee =
      toNumber((obj.deliveryFee as Record<string, unknown> | undefined)?.amount) ||
      toNumber(obj.delivery_fee) ||
      toNumber(obj.deliveryFee)

    const serviceFee =
      toNumber((obj.serviceFee as Record<string, unknown> | undefined)?.amount) ||
      toNumber(obj.service_fee) ||
      0

    const rating =
      toRating(obj.rating) ||
      toRating((obj.rating as Record<string, unknown> | undefined)?.score) ||
      toRating(obj.score)

    const deepLink = normalizeLink(
      (obj.deepLink as string | undefined) ||
      (obj.url as string | undefined) ||
      (obj.href as string | undefined),
    )

    const matchScore = scoreDishMatch(name, dish)
    if (restaurant && price > 0 && isActionableLink(deepLink) && matchScore > 0) {
      out.push({
        name,
        restaurant,
        price,
        delivery_fee: deliveryFee,
        service_fee: serviceFee,
        total: price + deliveryFee + serviceFee,
        rating,
        deep_link: deepLink,
        platform: 'talabat',
      })
    }

    for (const v of Object.values(obj)) {
      if (v && (typeof v === 'object' || Array.isArray(v))) stack.push(v)
    }
  }

  return dedupe(out).filter(isActionableDish).slice(0, MAX_ITEMS)
}

async function extractMenuItemsFromRestaurant(
  context: BrowserContext,
  restaurantUrl: string,
  dish: string,
): Promise<DishResult[]> {
  const page = await context.newPage()
  try {
    await page.goto(restaurantUrl, { waitUntil: 'domcontentloaded', timeout: 15_000 }).catch(() => {})
    await page.waitForTimeout(2200)

    const result = await page.evaluate(
      ({ query, url }: { query: string; url: string }) => {
        const tokens = query
          .toLowerCase()
          .split(/[^a-z0-9]+/g)
          .filter((x) => x.length >= 3)
        const tokenHit = (s: string) => {
          if (tokens.length === 0) return true
          const lower = s.toLowerCase()
          return tokens.some((t) => lower.includes(t))
        }

        const parsePrice = (text: string): number => {
          const m = text.match(/(?:AED|د\.إ|dhs?\.?)\s*(\d+\.?\d*)/i) || text.match(/(\d+\.?\d*)/)
          return m ? parseFloat(m[1]) : 0
        }

        const restaurant =
          document.querySelector('h1')?.textContent?.trim() ||
          document.title.replace(/\s*\|.*$/, '').trim() ||
          'Talabat'

        type Raw = {
          name: string
          restaurant: string
          price: number
          delivery_fee: number
          service_fee: number
          total: number
          rating: number | null
          deep_link: string
          platform: 'talabat'
        }

        const items: Raw[] = []
        const selectors = [
          '[data-testid*="menu-item"]',
          '[data-testid*="product"]',
          '[class*="menuItem"]',
          '[class*="MenuItem"]',
          '[class*="dish"]',
        ]

        for (const sel of selectors) {
          const cards = document.querySelectorAll<HTMLElement>(sel)
          if (cards.length === 0) continue
          cards.forEach((card) => {
            const name =
              card.querySelector('h3, h4, [class*="name"], [class*="title"]')?.textContent?.trim() ||
              ''
            if (!name || !tokenHit(name)) return

            const price = parsePrice(card.textContent || '')
            if (price <= 0) return

            items.push({
              name,
              restaurant,
              price,
              delivery_fee: 0,
              service_fee: 0,
              total: price,
              rating: null,
              deep_link: url,
              platform: 'talabat',
            })
          })
          if (items.length > 0) break
        }

        return items.slice(0, 5)
      },
      { query: dish, url: restaurantUrl },
    )

    return result
  } catch {
    return []
  } finally {
    await page.close().catch(() => {})
  }
}

// Talabat search shows restaurant-level cards. We extract name, rating, delivery fee,
// and min-order (used as price proxy — dish-level pricing requires per-restaurant navigation).
export async function scrapeTalabat(dish: string, area: string | null): Promise<DishResult[]> {
  let context: BrowserContext | null = null
  let page: Page | null = null
  const fromNetwork: DishResult[] = []

  try {
    const browser = await getBrowser()
    context = await browser.newContext({
      userAgent: UA,
      viewport: { width: 1366, height: 768 },
      locale: 'en-AE',
      extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8' },
    })
    page = await context.newPage()
    page.on('response', async (resp) => {
      try {
        const url = resp.url().toLowerCase()
        const ct = (resp.headers()['content-type'] || '').toLowerCase()
        if (!ct.includes('application/json')) return
        if (!/search|restaurant|menu|catalog|vendor|discovery/.test(url)) return
        const json = await resp.json()
        const extracted = extractFromJson(json, dish)
        if (extracted.length > 0) fromNetwork.push(...extracted)
      } catch {
        // ignore malformed response bodies
      }
    })

    const q = encodeURIComponent(dish)
    const areaParam = area ? `&areaName=${encodeURIComponent(area)}` : ''
    await page.goto(`${BASE}/search?q=${q}${areaParam}`, {
      waitUntil: 'domcontentloaded',
      timeout: 12000,
    }).catch(async () => {
      await page?.goto(RESTAURANTS_URL, { waitUntil: 'domcontentloaded', timeout: 12000 }).catch(() => {})
    })
    await page.waitForTimeout(3500)

    const title = (await page.title()).toLowerCase()
    const bodyText = (await page.locator('body').innerText().catch(() => '')).toLowerCase()
    if (title.includes('page not found') || bodyText.includes("page that you are looking for doesn't exist")) {
      await page.goto(RESTAURANTS_URL, { waitUntil: 'domcontentloaded', timeout: 12000 }).catch(() => {})
      await page.waitForTimeout(2500)
    }

    // Dismiss cookie consent if present
    await page
      .locator('button:has-text("Accept"), [data-testid="cookie-accept"]')
      .click({ timeout: 1500 })
      .catch(() => {})

    // Wait for restaurant result cards
    const CARD_SEL = [
      '[data-testid="restaurant-list-item"]',
      '[data-testid="restaurantResultCard"]',
      '[class*="restaurantCard"]',
      'li[class*="restaurant"]',
      'a[href^="/uae/"]',
    ].join(', ')

    await page.waitForSelector(CARD_SEL, { timeout: 5000 }).catch(() => {})

    type RawItem = {
      name: string
      restaurant: string
      price: number
      delivery_fee: number
      service_fee: number
      total: number
      rating: number | null
      deep_link: string
      platform: 'talabat'
    }

    const results: RawItem[] = await page.evaluate(
      ({ dish: d, base }: { dish: string; base: string }): RawItem[] => {
        const tokens = d.toLowerCase().split(/[^a-z0-9]+/g).filter((x) => x.length >= 3)
        const tokenHit = (s: string): boolean => {
          if (tokens.length === 0) return true
          const lower = s.toLowerCase()
          return tokens.some((t) => lower.includes(t))
        }

        // ── 1. Attempt dish-level cards (shown for some search queries) ──────────
        const dishSelectors = [
          '[data-testid="recipe"]',
          '[data-testid="dish-card"]',
          '[class*="DishCard"]',
          '[class*="recipeCard"]',
        ]
        for (const sel of dishSelectors) {
          const dishCards = document.querySelectorAll<HTMLElement>(sel)
          if (dishCards.length === 0) continue

          const items: RawItem[] = []
          dishCards.forEach((card: HTMLElement) => {
            const nameEl = card.querySelector('[class*="name"], [class*="title"], h3, h4')
            const name = nameEl?.textContent?.trim() || d

            const restEl = card.querySelector('[class*="restaurant"], [class*="vendor"]')
            const restaurant = restEl?.textContent?.trim() || ''

            const priceText = card.querySelector('[class*="price"]')?.textContent || ''
            const priceMatch = priceText.match(/(\d+\.?\d*)/)
            const price = priceMatch ? parseFloat(priceMatch[1]) : 0

            const link = card.querySelector('a') as HTMLAnchorElement | null
            const deep_link = link?.href || base

            const ratingEl = card.querySelector('[class*="rating"]')
            const ratingText = ratingEl?.textContent?.trim() || ''
            const ratingMatch = ratingText.match(/(\d+\.?\d*)/)
            const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null

            if (restaurant || deep_link !== base) {
              items.push({
                name,
                restaurant,
                price,
                delivery_fee: 0,
                service_fee: 0,
                total: price,
                rating,
                deep_link,
                platform: 'talabat' as const,
              })
            }
          })
          if (items.length > 0) return items.slice(0, 8)
        }

        // ── 2. Fall back to restaurant-level cards ────────────────────────────────
        const cardSelectors = [
          '[data-testid="restaurant-list-item"]',
          '[data-testid="restaurantResultCard"]',
          '[class*="restaurantCard"]',
          'li[class*="restaurant"]',
        ]
        for (const sel of cardSelectors) {
          const cards = document.querySelectorAll<HTMLElement>(sel)
          if (cards.length === 0) continue

          const items: RawItem[] = []
          Array.from(cards)
            .slice(0, 8)
            .forEach((card: HTMLElement) => {
              const restEl = card.querySelector(
                '[data-testid="restaurant-name"], [class*="restaurantName"], h2, h3',
              )
              const restaurant = restEl?.textContent?.trim() || ''
              if (!restaurant) return

              const link = card.querySelector('a') as HTMLAnchorElement | null
              const deep_link = link?.href || base

              // Rating: try aria-label first (e.g. "Rated 4.5 out of 5"), then text
              const ratingEl = card.querySelector(
                '[data-testid*="rating"], [class*="rating"], [aria-label*="ating"]',
              )
              const ratingText =
                ratingEl?.getAttribute('aria-label') || ratingEl?.textContent || ''
              const ratingMatch = ratingText.match(/(\d+\.?\d*)/)
              const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null

              // Delivery fee: look for "AED X.XX delivery" or "Free delivery"
              const fullText = card.textContent || ''
              let delivery_fee = 0
              if (!fullText.toLowerCase().includes('free delivery')) {
                const feeMatch = fullText.match(
                  /(?:AED|dhs?\.?)\s*(\d+\.?\d*)\s*(?:delivery|fee)/i,
                )
                if (feeMatch) delivery_fee = parseFloat(feeMatch[1])
              }

              // Min order as dish-price proxy
              const minMatch = fullText.match(/[Mm]in(?:imum)?(?:\s+order)?[^0-9]{0,20}(\d+(?:\.\d+)?)/i)
              const anyAedMatch = fullText.match(/(?:AED|dhs?\.?)\s*(\d+(?:\.\d+)?)/i)
              const price = minMatch
                ? parseFloat(minMatch[1])
                : anyAedMatch
                ? parseFloat(anyAedMatch[1])
                : 0

              items.push({
                name: d,
                restaurant,
                price,
                delivery_fee,
                service_fee: 0,
                total: price + delivery_fee,
                rating,
                deep_link,
                platform: 'talabat' as const,
              })
            })
          if (items.length > 0) return items
        }

        // ── 3. Restaurants list page fallback (/uae/restaurants) ─────────────────
        const links = Array.from(document.querySelectorAll('a'))
          .filter((a) => (a.getAttribute('href') || '').startsWith('/uae/'))
          .filter((a) => {
            const href = (a.getAttribute('href') || '').toLowerCase()
            return !href.startsWith('/uae/restaurants') && !href.startsWith('/uae/search')
          })
          .map((a) => ({
            href: a.getAttribute('href') || '',
            text: (a.textContent || '').trim().replace(/\s+/g, ' '),
          }))
          .filter((x) => x.text.length > 0)

        if (links.length > 0) {
          const matched = links.filter((x) => tokenHit(x.text))
          const pick = (matched.length > 0 ? matched : links).slice(0, 10)
          const items: RawItem[] = pick.map((x) => {
            const compact = x.text
            const restaurant = compact.split(/[A-Z][a-z]+,|,/)[0].trim() || compact.slice(0, 40)
            const deep_link = x.href.startsWith('http') ? x.href : `https://www.talabat.com${x.href}`
            return {
              name: d,
              restaurant,
              price: 0,
              delivery_fee: 0,
              service_fee: 0,
              total: 0,
              rating: null,
              deep_link,
              platform: 'talabat' as const,
            }
          })
          if (items.length > 0) return items
        }

        return []
      },
      { dish, base: BASE },
    )

    const networkResults = dedupe(fromNetwork).filter(isActionableDish)
    const domResults = dedupe(results).filter(isActionableDish)
    const actionableInitial = dedupe([...domResults, ...networkResults])

    if (actionableInitial.length > 0) {
      console.log(`[talabat] "${dish}" → ${actionableInitial.length} results (actionable)`)
      return actionableInitial.slice(0, MAX_ITEMS)
    }

    // Fallback: visit top restaurant links and extract item-level prices from menu pages.
    const rawLinks = dedupe(results)
      .map((x) => normalizeLink(x.deep_link))
      .filter((x) => x !== BASE)
    const restaurantLinks = rawLinks
      .filter((x) => !/\/search(\?|$)/i.test(x))
      .slice(0, MAX_RESTAURANT_CRAWL)

    const enriched: DishResult[] = []
    for (const url of restaurantLinks) {
      const items = await extractMenuItemsFromRestaurant(context, url, dish)
      if (items.length > 0) enriched.push(...items)
    }

    const enrichedActionable = dedupe(enriched).filter(isActionableDish).slice(0, MAX_ITEMS)
    console.log(`[talabat] "${dish}" → ${enrichedActionable.length} results (menu-enriched)`)
    return enrichedActionable
  } catch (err) {
    console.error('[talabat] error:', err instanceof Error ? err.message : err)
    return []
  } finally {
    await context?.close().catch(() => {})
  }
}
