// Playwright helpers for E2E bot testing via Telegram test accounts.
// Requires @playwright/test + a dedicated test Telegram account (not the bot token).
// Stub — to be implemented in Step 8 when E2E coverage is added.

export interface PlaywrightBotSession {
  sendMessage(text: string): Promise<string>
  close(): Promise<void>
}

export async function createBotSession(
  _botUsername: string,
): Promise<PlaywrightBotSession> {
  throw new Error('Playwright E2E sessions not yet implemented. Use simulateUserJourney() for integration tests.')
}
