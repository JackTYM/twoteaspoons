import type { H3Event } from 'h3'
import puppeteer, { type BrowserWorker } from '@cloudflare/puppeteer'

interface CloudflareEnv {
  BROWSER: BrowserWorker
}

/**
 * Fetch a page's fully-rendered HTML via Cloudflare Browser Rendering.
 * Used as a fallback when a source site's bot protection (e.g. a Cloudflare
 * JS challenge) blocks a plain server-side fetch.
 */
export async function fetchRenderedHtml(event: H3Event, url: string): Promise<string> {
  const context = event.context.cloudflare
  if (!context?.env?.BROWSER) {
    throw createError({
      statusCode: 500,
      message: 'Browser rendering not configured',
    })
  }

  const browser = await puppeteer.launch((context.env as CloudflareEnv).BROWSER)

  try {
    const page = await browser.newPage()
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 })
    return await page.content()
  } finally {
    await browser.close()
  }
}
