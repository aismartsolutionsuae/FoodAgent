import { chromium, type Browser } from 'playwright'

// Shared Chromium instance — Railway is a persistent process, so we reuse the browser
// across requests and only create a new BrowserContext per scrape.
export const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

let _browser: Browser | null = null

export async function getBrowser(): Promise<Browser> {
  if (_browser?.isConnected()) return _browser

  _browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--disable-extensions',
    ],
  })
  _browser.on('disconnected', () => {
    _browser = null
  })
  return _browser
}
