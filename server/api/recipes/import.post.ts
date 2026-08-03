import { parseRecipeFromHtml, parseIngredientString } from '../../utils/recipeParser'
import { requireAuth } from '../../utils/session'
import { fetchRenderedHtml } from '../../utils/browserRender'

interface ImportBody {
  url: string
}

const MAX_HTML_BYTES = 5 * 1024 * 1024 // 5 MB
const FETCH_TIMEOUT_MS = 10_000

// Blocks SSRF against internal/private/link-local targets.
function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase()
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return true
  if (host === '0.0.0.0' || host === '::1' || host === '169.254.169.254') return true

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])]
    if (a === 127 || a === 10 || a === 0) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 169 && b === 254) return true
  }

  return false
}

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const body = await readBody<ImportBody>(event)

  if (!body.url) {
    throw createError({
      statusCode: 400,
      message: 'URL is required',
    })
  }

  // Validate URL
  let url: URL
  try {
    url = new URL(body.url)
  } catch {
    throw createError({
      statusCode: 400,
      message: 'Invalid URL',
    })
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw createError({
      statusCode: 400,
      message: 'Only http and https URLs are supported',
    })
  }

  if (isBlockedHostname(url.hostname)) {
    throw createError({
      statusCode: 400,
      message: 'This URL cannot be imported',
    })
  }

  // Fetch the page
  let html: string

  try {
    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
    })

    if (response.status === 404) {
      throw createError({
        statusCode: 404,
        message: 'Recipe not found at this URL. Check the link and try again.',
      })
    }

    if (response.status === 403) {
      // Bot-protected site (e.g. a Cloudflare JS challenge) - fall back to
      // rendering the page in a real browser instead of a plain fetch.
      try {
        html = await fetchRenderedHtml(url.toString())
      } catch {
        throw createError({
          statusCode: 403,
          message: 'This website blocks automated access. Try copying the recipe manually.',
        })
      }
    } else {
      if (!response.ok) {
        throw createError({
          statusCode: 502,
          message: `Failed to fetch recipe: HTTP ${response.status}`,
        })
      }

      const contentLength = response.headers.get('content-length')
      if (contentLength && Number(contentLength) > MAX_HTML_BYTES) {
        throw createError({
          statusCode: 413,
          message: 'This page is too large to import',
        })
      }

      html = await response.text()
    }

    if (html.length > MAX_HTML_BYTES) {
      throw createError({
        statusCode: 413,
        message: 'This page is too large to import',
      })
    }
  } catch (err) {
    // Re-throw H3 errors as-is
    if (err && typeof err === 'object' && 'statusCode' in err) {
      throw err
    }

    throw createError({
      statusCode: 502,
      message: `Failed to fetch URL: ${err instanceof Error ? err.message : 'Unknown error'}`,
    })
  }

  // Parse the recipe
  const parsed = parseRecipeFromHtml(html, url.toString())

  if (!parsed) {
    throw createError({
      statusCode: 422,
      message: 'Could not find recipe data on this page. Try a different URL or enter the recipe manually.',
    })
  }

  // Parse ingredient strings into structured format
  const structuredIngredients = parsed.ingredients.map(ing => parseIngredientString(ing))

  // Calculate times if we have totalTime but not prep/cook
  let prepTime = parsed.prepTime
  let cookTime = parsed.cookTime

  if (!prepTime && !cookTime && parsed.totalTime) {
    // Estimate: assume 1/3 prep, 2/3 cook
    prepTime = Math.round(parsed.totalTime / 3)
    cookTime = parsed.totalTime - prepTime
  }

  return {
    recipe: {
      title: parsed.title,
      description: parsed.description,
      coverPhoto: parsed.image,
      prepTime,
      cookTime,
      servings: parsed.servings,
      sourceUrl: parsed.sourceUrl,
      sourceAuthor: parsed.sourceAuthor,
      sourceSite: parsed.sourceSite,
      ingredients: structuredIngredients,
      instructions: parsed.instructions.map(inst => ({
        content: inst.content,
        timerMinutes: inst.timerMinutes,
      })),
    },
  }
})
