export interface AdminBotNotification {
  type: 'approval_request' | 'alert' | 'info' | 'metric_update'
  agentType: 'marketing' | 'support' | 'experiments' | 'qa'
  severity?: 'low' | 'normal' | 'high' | 'critical'
  title: string
  body: string
  approvalId?: string
  context?: Record<string, unknown>
}

// Единая точка уведомлений в admin-bot для всех агентов.
// Сначала пробует ADMIN_BOT_WEBHOOK_URL (для server-to-server).
// Fallback — Telegram Bot API напрямую (достаточно для MVP).
export async function notifyAdminBot(notification: AdminBotNotification): Promise<void> {
  const webhookUrl = process.env.ADMIN_BOT_WEBHOOK_URL

  if (webhookUrl) {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notification),
    })
    return
  }

  // Fallback: прямой вызов Telegram Bot API
  const token = process.env.ADMIN_BOT_TOKEN
  const ownerId = process.env.OWNER_TELEGRAM_ID
  if (!token || !ownerId) return

  const severityIcon: Record<string, string> = {
    low: 'ℹ️', normal: '🔔', high: '⚠️', critical: '🚨',
  }
  const icon = severityIcon[notification.severity ?? 'normal']
  const text = `${icon} <b>[${notification.agentType}] ${notification.title}</b>\n\n${notification.body}`

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: ownerId, text, parse_mode: 'HTML' }),
  })
}
