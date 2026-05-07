import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { i18n } from '@/lib/bot/i18n'
import { InlineKeyboard } from 'grammy'

// Vercel Cron: daily at 09:00 UTC. Checks trial expiry and sends reminders.
export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const in1Day = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString()
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString()

  // Users whose trial expires in ~1 day
  const { data: expiring1 } = await supabase
    .from('subscriptions')
    .select('user_id, trial_expires_at, users!inner(telegram_id, language)')
    .eq('status', 'trial')
    .lte('trial_expires_at', in1Day)
    .gt('trial_expires_at', now.toISOString())

  // Users whose trial expires in ~3 days
  const { data: expiring3 } = await supabase
    .from('subscriptions')
    .select('user_id, trial_expires_at, users!inner(telegram_id, language)')
    .eq('status', 'trial')
    .lte('trial_expires_at', in3Days)
    .gt('trial_expires_at', in1Day)

  // Users whose trial has just expired
  const { data: expired } = await supabase
    .from('subscriptions')
    .select('user_id, users!inner(telegram_id, language)')
    .eq('status', 'trial')
    .lte('trial_expires_at', now.toISOString())

  const token = process.env.TELEGRAM_BOT_TOKEN!
  const lsUrl = process.env.LEMONSQUEEZY_CHECKOUT_URL ?? '#'

  async function sendMsg(telegramId: number, text: string) {
    const kb = new InlineKeyboard().url('💳 Subscribe', lsUrl)
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramId,
        text,
        reply_markup: kb,
      }),
    })
  }

  let sent = 0

  for (const row of expiring1 ?? []) {
    const user = (row as any).users
    const s = i18n(user.language)
    await sendMsg(user.telegram_id, s.trial_reminder_1)
    sent++
  }

  for (const row of expiring3 ?? []) {
    const user = (row as any).users
    const s = i18n(user.language)
    await sendMsg(user.telegram_id, s.trial_reminder_3(3))
    sent++
  }

  for (const row of expired ?? []) {
    const user = (row as any).users
    const s = i18n(user.language)
    // Mark as expired in DB
    await supabase
      .from('subscriptions')
      .update({ status: 'expired' })
      .eq('user_id', row.user_id)
    await sendMsg(user.telegram_id, s.trial_expired)
    sent++
  }

  return NextResponse.json({ ok: true, sent })
}
