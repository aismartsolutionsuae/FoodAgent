import express from 'express'
import { scrapeTalabat } from './scrapers/talabat'
import { scrapeDeliveroo } from './scrapers/deliveroo'
import type { DishResult } from './types'

const app = express()
app.use(express.json())

const PORT = process.env.PORT ?? 3001
const WORKER_SECRET = process.env.SCRAPER_WORKER_SECRET ?? ''
// Pipeline AbortSignal fires at 10 s — give each platform 9 s so the worker
// always responds before the caller times out.
const PLATFORM_TIMEOUT_MS = 9_000

function isActionableResult(item: DishResult): boolean {
  // Require a real URL pointing to a specific restaurant/dish page.
  // Price is NOT required here — the search handler displays "price TBC" for total=0 entries;
  // filtering them here would silently drop valid restaurant cards from Talabat.
  if (!item.deep_link || !/^https?:\/\//i.test(item.deep_link)) return false
  if (/\/(search|restaurants)(\?|$)/i.test(item.deep_link)) return false
  if (!item.restaurant || item.restaurant.trim().length === 0) return false
  return true
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T | null> {
  let timer: NodeJS.Timeout | null = null
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => {
          console.log(`[worker] ${label} timed out after ${ms}ms`)
          resolve(null)
        }, ms)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

function requireSecret(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.headers['x-worker-secret']
  if (!WORKER_SECRET || token !== WORKER_SECRET) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  next()
}

// POST /scrape
// Body: { dish: string, area: string | null, platforms: ('talabat' | 'deliveroo')[] }
// Returns: DishResult[]   (plain array — the Vercel caller casts directly)
app.post('/scrape', requireSecret, async (req, res) => {
  const { dish, area = null, platforms = ['talabat', 'deliveroo'] } = req.body as {
    dish: string
    area: string | null
    platforms: string[]
  }

  const dishQuery = dish?.trim()
  const areaQuery = typeof area === 'string' ? area.trim() : null

  if (!dishQuery) {
    res.status(400).json({ error: 'dish is required' })
    return
  }

  try {
    const tasks: Promise<DishResult[]>[] = []
    if (platforms.includes('talabat')) {
      tasks.push(
        (async () => {
          const data = await withTimeout(
            scrapeTalabat(dishQuery, areaQuery),
            PLATFORM_TIMEOUT_MS,
            'talabat',
          )
          if (!data) {
            return []
          }
          return data
        })(),
      )
    }
    if (platforms.includes('deliveroo')) {
      tasks.push(
        (async () => {
          const data = await withTimeout(
            scrapeDeliveroo(dishQuery, areaQuery),
            PLATFORM_TIMEOUT_MS,
            'deliveroo',
          )
          if (!data) {
            return []
          }
          return data
        })(),
      )
    }
    console.log(
      `[worker] platforms=${platforms.join(',')} tasks=${tasks.length} dish="${dishQuery}" area="${areaQuery ?? ''}" timeout=${PLATFORM_TIMEOUT_MS}ms`,
    )

    const settled = await Promise.allSettled(tasks)
    const results = settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    const actionable = results.filter(isActionableResult)

    console.log(
      `[worker] "${dishQuery}" total=${results.length} actionable=${actionable.length}`,
    )
    res.json(actionable)
  } catch (err) {
    console.error('[worker]', err)
    res.status(500).json({ error: 'Scraping failed' })
  }
})

app.get('/health', (_req, res) => res.json({ ok: true }))

app.listen(PORT, () => {
  console.log(`Worker listening on port ${PORT}`)
})
