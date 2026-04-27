import { parseRecipeFromHtml, parseIngredientString } from '../../utils/recipeParser'

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

  // Fetch the page
  let html: string

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

    if (response.status === 403) {
      throw createError({
        statusCode: 403,
        message: 'This website blocks automated access. Try copying the recipe manually.',
      })
    }

    if (!response.ok) {
      throw createError({
        statusCode: 502,
        message: `Failed to fetch recipe: HTTP ${response.status}`,
      })
    }

    html = await response.text()
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
