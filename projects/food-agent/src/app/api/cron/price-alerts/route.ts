import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { i18n } from '@/lib/bot/i18n'
import { InlineKeyboard } from 'grammy'

// Vercel Cron: every 6 hours. Compares latest prices to previous search_history
// for active users and sends a price drop alert if drop >= 15% of previous total.
//
// Phase MVP: simple implementation — re-queries the last search per user
// and compares against their cached results snapshot.
const MIN_DELTA_PERCENT = 15

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Get last search per active user (within 24h)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: searches } = await supabase
    .from('search_history')
    .select('user_id, results_snapshot, created_at, users!inner(telegram_id, language, subscriptions!inner(status))')
    .gte('created_at', since)
    .order('created_at', { ascending: false })

  if (!searches?.length) return NextResponse.json({ ok: true, alerts: 0 })

  const token = process.env.TELEGRAM_BOT_TOKEN!
  let alerts = 0

  // Deduplicate — one alert per user
  const seen = new Set<string>()

  for (const row of searches) {
    if (seen.has(row.user_id)) continue
    seen.add(row.user_id)

    const user = (row as any).users
    const sub = user.subscriptions?.[0]
    if (!sub || !['trial', 'active'].includes(sub.status)) continue

    const snapshot = row.results_snapshot as any[]
    if (!snapshot?.length) continue

    const topPrevious = snapshot[0]

    // Check current cache for the same dish
    const { data: cached } = await supabase
      .from('price_cache')
      .select('results')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (!cached?.results) continue

    const current = (cached.results as any[]).find(
      (d: any) => d.restaurant === topPrevious.restaurant && d.platform === topPrevious.platform
    )
    if (!current) continue

    const delta = Math.round(topPrevious.total - current.total)
    const deltaPercent = (topPrevious.total - current.total) / topPrevious.total * 100
    if (deltaPercent < MIN_DELTA_PERCENT) continue

    const s = i18n(user.language)
    const kb = new InlineKeyboard().url(s.order_btn, current.deep_link)
      .row().text(s.dismiss_alert_btn, 'dismiss_alert')

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: user.telegram_id,
        text: s.price_alert(
          current.name,
          current.restaurant,
          delta,
          current.total,
          current.platform,
        ),
        reply_markup: kb,
      }),
    })
    alerts++
  }

  return NextResponse.json({ ok: true, alerts })
}
