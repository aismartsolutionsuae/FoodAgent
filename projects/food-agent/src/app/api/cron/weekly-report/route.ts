import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { i18n } from '@/lib/bot/i18n'
import { InlineKeyboard } from 'grammy'

// Vercel Cron: every Sunday at 08:00 UTC.
// Sends weekly stats to all trial/active users.
export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Get all active/trial users
  const { data: users } = await supabase
    .from('users')
    .select('id, telegram_id, language, subscriptions!inner(status)')

  if (!users?.length) return NextResponse.json({ ok: true, sent: 0 })

  const token = process.env.TELEGRAM_BOT_TOKEN!
  let sent = 0

  for (const user of users) {
    const sub = (user as any).subscriptions?.[0]
    if (!sub || !['trial', 'active'].includes(sub.status)) continue

    // Count searches this week
    const { count: searches } = await supabase
      .from('search_history')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', weekAgo)

    if (!searches) continue

    // Find top dish this week from search history snapshots
    const { data: history } = await supabase
      .from('search_history')
      .select('results_snapshot')
      .eq('user_id', user.id)
      .gte('created_at', weekAgo)
      .order('created_at', { ascending: false })
      .limit(10)

    const bestDish = history?.[0]?.results_snapshot?.[0]?.name ?? '—'

    // saved = sum of (max_total - min_total) per search — what user avoided paying
    // equivalent = sum of cheapest dish per search — what was actually recommended
    let saved = 0
    let equivalent = 0
    for (const row of history ?? []) {
      const results = row.results_snapshot as any[] | null
      if (!results?.length) continue
      const totals = results.map((d: any) => d.total as number).filter(Boolean)
      if (totals.length < 2) continue
      const minTotal = Math.min(...totals)
      const maxTotal = Math.max(...totals)
      saved += Math.round(maxTotal - minTotal)
      equivalent += Math.round(minTotal)
    }

    const s = i18n(user.language)
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/twa/dashboard`
    const kb = new InlineKeyboard().url(s.open_dashboard_btn, dashboardUrl)

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: user.telegram_id,
        text: s.weekly_report(searches, saved, equivalent, bestDish),
        reply_markup: kb,
      }),
    })
    sent++
  }

  return NextResponse.json({ ok: true, sent })
}
