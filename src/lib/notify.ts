// Sends a plain-text alert to the bot owner via Telegram Bot API.
// Used by the scraper error path and cron jobs — fire and forget.
export async function notifyOwner(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const ownerId = process.env.OWNER_TELEGRAM_ID

  if (!token || !ownerId) return

  const url = `https://api.telegram.org/bot${token}/sendMessage`

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: ownerId,
      text: `🤖 FoodAgent alert\n\n${message}`,
    }),
  }).catch(() => {})
}
