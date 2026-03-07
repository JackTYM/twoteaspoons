import puppeteer from 'puppeteer'
import { accessSync, constants } from 'node:fs'

interface BrowserFetchOptions {
  timeout?: number
  waitForSelector?: string
}

interface BrowserFetchResult {
  html: string
  finalUrl: string
  status: number
}

/**
 * Find the first executable path that exists
 */
function findExecutable(paths: string[]): string | undefined {
  for (const p of paths) {
    try {
      accessSync(p, constants.X_OK)
      console.log(`[browserFetch] Found browser at: ${p}`)
      return p
    } catch {
      // Continue to next path
    }
  }
  console.log('[browserFetch] No browser executable found in:', paths)
  return undefined
}

/**
 * Fetch a URL using a headless browser to bypass bot protection.
 * Falls back to this when regular fetch returns 403.
 */
export async function browserFetch(
  url: string,
  options: BrowserFetchOptions = {}
): Promise<BrowserFetchResult> {
  const { timeout = 30000, waitForSelector } = options

  // Try to find system Chromium/Chrome
  const possiblePaths = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
  ].filter(Boolean) as string[]

  const executablePath = findExecutable(possiblePaths)

  console.log(`[browserFetch] Launching browser for: ${url}`)

  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
    ],
  })

  try {
    const page = await browser.newPage()

    // Set a realistic viewport
    await page.setViewport({ width: 1920, height: 1080 })

    // Set user agent to look like a real browser
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )

    // Track the response status
    let responseStatus = 200
    page.on('response', (response) => {
      if (response.url() === url || response.url().startsWith(url.replace(/\/$/, ''))) {
        responseStatus = response.status()
      }
    })

    // Navigate to the page
    const response = await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout,
    })

    // Wait for specific selector if provided (useful for JS-rendered content)
    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: 10000 }).catch(() => {
        // Ignore if selector not found - page might still have content
      })
    }

    // Get the page content and final URL (after redirects)
    const html = await page.content()
    let finalUrl = page.url()
    const status = response?.status() || responseStatus

    // Validate finalUrl - check for doubled URLs or malformed redirects
    const httpMatches = (finalUrl.match(/https?:\/\//g) || []).length
    if (httpMatches > 1) {
      console.warn(`[browserFetch] Detected malformed URL with ${httpMatches} protocols: ${finalUrl.slice(0, 100)}`)
      // Try to extract the first valid URL
      finalUrl = url // Fall back to original URL
    }

    // Only fail for server errors or if the page has no meaningful content
    if (status >= 500) {
      throw new Error(`HTTP ${status}`)
    }

    // Check if we got meaningful content (has recipe schema or reasonable content length)
    if (html.length < 1000 && status >= 400) {
      throw new Error(`HTTP ${status} - no content`)
    }

    console.log(`[browserFetch] Got ${html.length} chars with status ${status}, finalUrl: ${finalUrl}`)
    return { html, finalUrl, status }
  } finally {
    await browser.close()
  }
}
