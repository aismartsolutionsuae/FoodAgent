import { type BrowserContext, type Page } from 'playwright'
import { getBrowser, UA } from '../browser'
import type { DishResult } from '../types'

const BASE = 'https://deliveroo.ae'
// Fallback area used when no area is provided — centre of Dubai
const DEFAULT_AREA = 'Dubai Marina, Dubai, UAE'
const MAX_ITEMS = 10

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
  if (link.startsWith('/')) return `${BASE}${link}`
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
      (obj.brandName as string | undefined) ||
      (obj.vendorName as string | undefined) ||
      ((obj.restaurant as Record<string, unknown> | undefined)?.name as string | undefined) ||
      ((obj.brand as Record<string, unknown> | undefined)?.name as string | undefined) ||
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
        platform: 'deliveroo',
      })
    }

    for (const v of Object.values(obj)) {
      if (v && (typeof v === 'object' || Array.isArray(v))) stack.push(v)
    }
  }

  return dedupe(out).filter(isActionableDish).slice(0, MAX_ITEMS)
}

export async function scrapeDeliveroo(dish: string, area: string | null): Promise<DishResult[]> {
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
        if (!/search|restaurant|menu|catalog|vendor|graphql/.test(url)) return
        const json = await resp.json()
        const extracted = extractFromJson(json, dish)
        if (extracted.length > 0) fromNetwork.push(...extracted)
      } catch {
        // ignore malformed response bodies
      }
    })

    // Attempt direct search URL — Deliveroo may redirect to location selection
    const q = encodeURIComponent(dish)
    await page.goto(`${BASE}/search?q=${q}`, { waitUntil: 'domcontentloaded', timeout: 15000 })
    const initialTitle = (await page.title()).toLowerCase()
    if (initialTitle.includes('page not found')) {
      await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 12000 }).catch(() => {})
    }

    // If we land on a location-selection page, enter the area and proceed
    const currentUrl = page.url()
    const needsLocation =
      currentUrl.includes('/account/location') ||
      currentUrl === `${BASE}/` ||
      (await page.locator('input[placeholder*="address"], input[placeholder*="postcode"]').count()) > 0

    if (needsLocation) {
      const locationArea = area ?? DEFAULT_AREA
      const input = page.locator(
        'input[placeholder*="address"], input[placeholder*="postcode"], input[name="address"]',
      )
      await input.fill(locationArea, { timeout: 3000 }).catch(() => {})
      await page.waitForTimeout(800)

      // Pick first autocomplete suggestion
      await page
        .locator('[class*="suggestion"], [class*="autocomplete"] li, [role="option"]')
        .first()
        .click({ timeout: 2500 })
        .catch(() => {})
      await page.waitForTimeout(800)

      // Navigate to search
      await page.goto(`${BASE}/search?q=${q}`, { waitUntil: 'domcontentloaded', timeout: 6000 })
    }
    await page.waitForTimeout(3500)

    const title = (await page.title()).toLowerCase()
    const bodyText = (await page.locator('body').innerText().catch(() => '')).toLowerCase()
    if (title.includes('just a moment') || bodyText.includes('security verification') || bodyText.includes('cloudflare')) {
      console.log(`[deliveroo] "${dish}" blocked by security challenge`)
      return []
    }

    // Dismiss cookie banner
    await page
      .locator('button:has-text("Accept"), [data-testid="cookie-accept"]')
      .click({ timeout: 1500 })
      .catch(() => {})

    // Wait for dish or restaurant cards
    const RESULT_SEL = [
      '[class*="DishCard"]',
      '[data-testid="dish-card"]',
      '[class*="dish-card"]',
      '[class*="MenuItem"]',
      '[class*="RestaurantCard"]',
      '[class*="restaurant-card"]',
    ].join(', ')

    await page.waitForSelector(RESULT_SEL, { timeout: 5000 }).catch(() => {})

    type RawItem = {
      name: string
      restaurant: string
      price: number
      delivery_fee: number
      service_fee: number
      total: number
      rating: number | null
      deep_link: string
      platform: 'deliveroo'
    }

    const results: RawItem[] = await page.evaluate(
      ({ dish: d, base }: { dish: string; base: string }): RawItem[] => {
        // ── 1. Dish-level cards (Deliveroo shows per-item prices in search) ──────
        const dishSelectors = [
          '[class*="DishCard"]',
          '[data-testid="dish-card"]',
          '[class*="dish-card"]',
          '[class*="MenuItem"]',
          '[class*="menu-item"]',
        ]
        for (const sel of dishSelectors) {
          const cards = document.querySelectorAll<HTMLElement>(sel)
          if (cards.length === 0) continue

          const items: RawItem[] = []
          Array.from(cards)
            .slice(0, 8)
            .forEach((card: HTMLElement) => {
              const nameEl = card.querySelector(
                'h3, h4, [class*="name"], [class*="title"], [class*="Name"]',
              )
              const name = nameEl?.textContent?.trim() || d

              const restEl = card.querySelector(
                '[class*="restaurant"], [class*="vendor"], [class*="brand"], [class*="Restaurant"]',
              )
              const restaurant = restEl?.textContent?.trim() || ''

              const priceEl = card.querySelector('[class*="price"], [class*="Price"]')
              const priceText = priceEl?.textContent || ''
              const priceMatch = priceText.match(/(\d+\.?\d*)/)
              const price = priceMatch ? parseFloat(priceMatch[1]) : 0

              const anchor = (card.closest('a') || card.querySelector('a')) as HTMLAnchorElement | null
              const deep_link = anchor?.href || base

              const ratingEl = card.querySelector('[class*="rating"], [class*="Rating"], [aria-label*="ating"]')
              const ratingText =
                ratingEl?.getAttribute('aria-label') || ratingEl?.textContent || ''
              const ratingMatch = ratingText.match(/(\d+\.?\d*)/)
              const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null

              const tokens = d
                .toLowerCase()
                .split(/[^a-z0-9]+/g)
                .filter((x) => x.length >= 3)
              const tokenHit =
                tokens.length === 0 || tokens.some((t) => name.toLowerCase().includes(t))
              if (price > 0 && tokenHit) {
                items.push({
                  name,
                  restaurant,
                  price,
                  delivery_fee: 0,
                  service_fee: 0,
                  total: price,
                  rating,
                  deep_link,
                  platform: 'deliveroo' as const,
                })
              }
            })
          if (items.length > 0) return items
        }

        return []
      },
      { dish, base: BASE },
    )

    const domActionable = dedupe(results).filter(isActionableDish)
    if (domActionable.length > 0) {
      console.log(`[deliveroo] "${dish}" → ${domActionable.length} results (dom-actionable)`)
      return domActionable.slice(0, MAX_ITEMS)
    }

    const networkResults = dedupe(fromNetwork).filter(isActionableDish).slice(0, MAX_ITEMS)
    console.log(`[deliveroo] "${dish}" → ${networkResults.length} results (network-actionable)`)
    return networkResults
  } catch (err) {
    console.error('[deliveroo] error:', err instanceof Error ? err.message : err)
    return []
  } finally {
    await context?.close().catch(() => {})
  }
}
