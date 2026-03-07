import { parseRecipeFromHtml, parseIngredientString } from '../../utils/recipeParser'
import { browserFetch } from '../../utils/browserFetch'

interface ImportBody {
  url: string
}

export default defineEventHandler(async (event) => {
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

  // Fetch the page - try regular fetch first, fall back to headless browser
  let html: string
  let usedBrowser = false

  try {
    const response = await fetch(url.toString(), {
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

    // Any error status (403, 400, etc.) - try headless browser
    if (!response.ok) {
      throw new Error('NEED_BROWSER')
    }

    html = await response.text()
  } catch (err) {
    // Re-throw H3 errors as-is
    if (err && typeof err === 'object' && 'statusCode' in err) {
      throw err
    }

    // Try headless browser for bot protection or other fetch issues
    const shouldTryBrowser =
      err instanceof Error && err.message === 'NEED_BROWSER'

    if (shouldTryBrowser) {
      try {
        console.log(`[import] Using headless browser for: ${url.toString()}`)
        const result = await browserFetch(url.toString(), {
          timeout: 45000, // Increased timeout for slow sites
          // Wait for recipe schema to be present (common in recipe sites)
          waitForSelector: '[itemtype*="Recipe"], script[type="application/ld+json"]',
        })
        console.log(`[import] Browser fetch successful, got ${result.html.length} chars`)
        html = result.html
        // Use the final URL after redirects (validate it's a proper URL)
        try {
          const finalUrl = new URL(result.finalUrl)
          // Sanity check: detect doubled URLs (e.g., "https://example.com/pathhttps://example.com/path")
          // Check if the URL contains "http" more than once
          const httpCount = (finalUrl.href.match(/https?:\/\//g) || []).length
          if (httpCount === 1) {
            url = finalUrl
          } else {
            console.warn(`[import] Detected malformed URL with ${httpCount} protocols, keeping original`)
          }
        } catch {
          // Keep original url if finalUrl is invalid
        }
        usedBrowser = true
      } catch (browserErr) {
        const errorMessage = browserErr instanceof Error ? browserErr.message : String(browserErr)
        const errorStack = browserErr instanceof Error ? browserErr.stack : ''
        console.error('[import] Browser fetch failed:', {
          message: errorMessage,
          stack: errorStack,
          url: url.toString(),
        })
        throw createError({
          statusCode: 502,
          message: `Failed to fetch recipe: ${errorMessage.slice(0, 100)}`,
        })
      }
    } else {
      throw createError({
        statusCode: 502,
        message: `Failed to fetch URL: ${err instanceof Error ? err.message : 'Unknown error'}`,
      })
    }
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
    // Include metadata about how it was fetched (useful for debugging)
    _meta: {
      usedBrowser,
    },
  }
})
