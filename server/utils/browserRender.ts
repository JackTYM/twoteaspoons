const RENDER_TIMEOUT_MS = 20_000

interface ContentResponse {
  success: boolean
  result?: string
}

/**
 * Fetch a page's fully-rendered HTML via the Cloudflare Browser Rendering
 * REST API. Used as a fallback when a source site's bot protection (e.g. a
 * Cloudflare JS challenge) blocks a plain server-side fetch.
 *
 * Uses the REST API (not a Workers binding) because this project deploys to
 * Cloudflare Pages, which does not support the Browser Rendering binding.
 */
export async function fetchRenderedHtml(url: string): Promise<string> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const apiToken = process.env.CLOUDFLARE_BROWSER_RENDERING_TOKEN

  if (!accountId || !apiToken) {
    throw createError({
      statusCode: 500,
      message: 'Browser rendering not configured',
    })
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/browser-rendering/content`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        gotoOptions: { waitUntil: 'domcontentloaded', timeout: RENDER_TIMEOUT_MS },
      }),
      signal: AbortSignal.timeout(RENDER_TIMEOUT_MS),
    }
  )

  if (!response.ok) {
    throw createError({
      statusCode: 502,
      message: `Browser rendering request failed: HTTP ${response.status}`,
    })
  }

  const data = await response.json() as ContentResponse

  if (!data.success || typeof data.result !== 'string') {
    throw createError({
      statusCode: 502,
      message: 'Browser rendering returned no content',
    })
  }

  return data.result
}
