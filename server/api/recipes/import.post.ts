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
        'User-Agent': 'Mozilla/5.0 (compatible; TwoTeaspoons/1.0; +https://twotsps.com)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    html = await response.text()
  } catch (err) {
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
      instructions: parsed.instructions.map(content => ({ content })),
    },
  }
})
