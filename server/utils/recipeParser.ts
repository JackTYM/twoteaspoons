import * as cheerio from 'cheerio'

export interface ParsedRecipe {
  title: string
  description?: string
  image?: string
  prepTime?: number
  cookTime?: number
  totalTime?: number
  servings?: number
  ingredients: string[]
  instructions: string[]
  sourceUrl: string
  sourceAuthor?: string
  sourceSite?: string
}

interface JsonLdRecipe {
  '@type'?: string | string[]
  name?: string
  description?: string
  image?: string | string[] | { url?: string }
  prepTime?: string
  cookTime?: string
  totalTime?: string
  recipeYield?: string | number
  recipeIngredient?: string[]
  recipeInstructions?: Array<string | { text?: string; '@type'?: string }>
  author?: string | { name?: string; '@type'?: string }
}

/**
 * Parse ISO 8601 duration (PT30M, PT1H30M) to minutes
 */
function parseDuration(duration: string | undefined): number | undefined {
  if (!duration) return undefined

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
  if (!match) return undefined

  const hours = parseInt(match[1] || '0', 10)
  const minutes = parseInt(match[2] || '0', 10)
  return hours * 60 + minutes
}

/**
 * Parse servings from various formats
 */
function parseServings(yield_: string | number | undefined): number | undefined {
  if (!yield_) return undefined
  if (typeof yield_ === 'number') return yield_

  const match = yield_.match(/(\d+)/)
  return match && match[1] ? parseInt(match[1], 10) : undefined
}

/**
 * Extract image URL from various formats
 */
function extractImage(image: string | string[] | { url?: string } | undefined): string | undefined {
  if (!image) return undefined
  if (typeof image === 'string') return image
  if (Array.isArray(image)) return image[0]
  if (typeof image === 'object' && image.url) return image.url
  return undefined
}

/**
 * Extract author name from various formats
 */
function extractAuthor(author: string | { name?: string; '@type'?: string } | undefined): string | undefined {
  if (!author) return undefined
  if (typeof author === 'string') return author
  if (typeof author === 'object' && author.name) return author.name
  return undefined
}

/**
 * Parse instructions from various formats
 */
function parseInstructions(instructions: Array<string | { text?: string; '@type'?: string }> | undefined): string[] {
  if (!instructions) return []

  return instructions
    .map(inst => {
      if (typeof inst === 'string') return inst.trim()
      if (typeof inst === 'object' && inst.text) return inst.text.trim()
      return ''
    })
    .filter(Boolean)
}

/**
 * Try to parse JSON-LD schema.org Recipe data
 */
function parseJsonLd($: cheerio.CheerioAPI): ParsedRecipe | null {
  const scripts = $('script[type="application/ld+json"]')

  for (let i = 0; i < scripts.length; i++) {
    try {
      const content = $(scripts[i]).html()
      if (!content) continue

      const data = JSON.parse(content)

      // Handle @graph format
      const items = data['@graph'] || [data]

      for (const item of Array.isArray(items) ? items : [items]) {
        const type = item['@type']
        const isRecipe = type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))

        if (isRecipe) {
          const recipe = item as JsonLdRecipe
          return {
            title: recipe.name || 'Untitled Recipe',
            description: recipe.description,
            image: extractImage(recipe.image),
            prepTime: parseDuration(recipe.prepTime),
            cookTime: parseDuration(recipe.cookTime),
            totalTime: parseDuration(recipe.totalTime),
            servings: parseServings(recipe.recipeYield),
            ingredients: recipe.recipeIngredient || [],
            instructions: parseInstructions(recipe.recipeInstructions),
            sourceUrl: '',
            sourceAuthor: extractAuthor(recipe.author),
          }
        }
      }
    } catch {
      // Invalid JSON, continue to next script
    }
  }

  return null
}

/**
 * Try to parse microdata Recipe
 */
function parseMicrodata($: cheerio.CheerioAPI): ParsedRecipe | null {
  const recipeElement = $('[itemtype*="schema.org/Recipe"]')
  if (recipeElement.length === 0) return null

  const getItemProp = (prop: string): string | undefined => {
    const el = recipeElement.find(`[itemprop="${prop}"]`)
    return el.attr('content') || el.text().trim() || undefined
  }

  const getItemPropAll = (prop: string): string[] => {
    const results: string[] = []
    recipeElement.find(`[itemprop="${prop}"]`).each((_, el) => {
      const text = $(el).attr('content') || $(el).text().trim()
      if (text) results.push(text)
    })
    return results
  }

  const title = getItemProp('name')
  if (!title) return null

  return {
    title,
    description: getItemProp('description'),
    image: recipeElement.find('[itemprop="image"]').attr('src') ||
           recipeElement.find('[itemprop="image"]').attr('content'),
    prepTime: parseDuration(getItemProp('prepTime')),
    cookTime: parseDuration(getItemProp('cookTime')),
    totalTime: parseDuration(getItemProp('totalTime')),
    servings: parseServings(getItemProp('recipeYield')),
    ingredients: getItemPropAll('recipeIngredient'),
    instructions: getItemPropAll('recipeInstructions'),
    sourceUrl: '',
    sourceAuthor: getItemProp('author'),
  }
}

/**
 * Fallback: Try to extract recipe from common HTML patterns
 */
function parseHtmlFallback($: cheerio.CheerioAPI): ParsedRecipe | null {
  // Try to find title
  const titleText = $('title').text()
  const titleFromTag = titleText ? (titleText.split('|')[0]?.split('-')[0]?.trim() || '') : ''
  const title = $('h1').first().text().trim() ||
                $('[class*="recipe-title"]').first().text().trim() ||
                $('[class*="recipe_title"]').first().text().trim() ||
                titleFromTag

  if (!title) return null

  // Try to find ingredients
  const ingredients: string[] = []
  const ingredientSelectors = [
    '[class*="ingredient"] li',
    '[class*="ingredients"] li',
    '.ingredient-list li',
    '.recipe-ingredients li',
    '[data-ingredient]',
  ]

  for (const selector of ingredientSelectors) {
    $(selector).each((_, el) => {
      const text = $(el).text().trim()
      if (text && text.length < 200) {
        ingredients.push(text)
      }
    })
    if (ingredients.length > 0) break
  }

  // Try to find instructions
  const instructions: string[] = []
  const instructionSelectors = [
    '[class*="instruction"] li',
    '[class*="instructions"] li',
    '[class*="direction"] li',
    '[class*="directions"] li',
    '[class*="step"] p',
    '.recipe-instructions li',
    '.recipe-directions li',
  ]

  for (const selector of instructionSelectors) {
    $(selector).each((_, el) => {
      const text = $(el).text().trim()
      if (text && text.length > 10 && text.length < 1000) {
        instructions.push(text)
      }
    })
    if (instructions.length > 0) break
  }

  // Try to find image
  const image = $('[class*="recipe"] img').first().attr('src') ||
                $('article img').first().attr('src') ||
                $('meta[property="og:image"]').attr('content')

  // Try to find description
  const description = $('meta[name="description"]').attr('content') ||
                      $('meta[property="og:description"]').attr('content')

  return {
    title,
    description,
    image,
    ingredients,
    instructions,
    sourceUrl: '',
  }
}

/**
 * Main function to parse a recipe from HTML
 */
export function parseRecipeFromHtml(html: string, url: string): ParsedRecipe | null {
  const $ = cheerio.load(html)

  // Extract site name
  const siteName = $('meta[property="og:site_name"]').attr('content') ||
                   new URL(url).hostname.replace('www.', '')

  // Try parsing strategies in order of reliability
  let recipe = parseJsonLd($)
  if (!recipe) recipe = parseMicrodata($)
  if (!recipe) recipe = parseHtmlFallback($)

  if (recipe) {
    recipe.sourceUrl = url
    recipe.sourceSite = siteName
  }

  return recipe
}

/**
 * Parse ingredient string into structured parts
 */
export function parseIngredientString(ingredientStr: string): {
  amount?: string
  unit?: string
  item: string
  notes?: string
} {
  // Common patterns:
  // "1 cup flour"
  // "2 tablespoons olive oil"
  // "1/2 teaspoon salt"
  // "3 large eggs"
  // "1 (14 oz) can diced tomatoes"

  const str = ingredientStr.trim()

  // Match amount at start (number, fraction, or mixed)
  const amountMatch = str.match(/^([\d./\s]+(?:\s*-\s*[\d./]+)?)\s*/)
  let amount: string | undefined
  let rest = str

  if (amountMatch && amountMatch[1]) {
    amount = amountMatch[1].trim()
    rest = str.slice(amountMatch[0].length)
  }

  // Match unit
  const units = [
    'tablespoons?', 'tbsp?', 'teaspoons?', 'tsp?',
    'cups?', 'ounces?', 'oz', 'pounds?', 'lbs?',
    'grams?', 'g', 'kilograms?', 'kg',
    'milliliters?', 'ml', 'liters?', 'l',
    'pieces?', 'slices?', 'cloves?', 'cans?',
    'bunche?s?', 'pinche?s?', 'dashes?',
    'large', 'medium', 'small',
  ]

  const unitPattern = new RegExp(`^(${units.join('|')})\\s+`, 'i')
  const unitMatch = rest.match(unitPattern)
  let unit: string | undefined

  if (unitMatch && unitMatch[1]) {
    unit = unitMatch[1].toLowerCase()
    // Normalize units
    if (unit.startsWith('tablespoon') || unit === 'tbsp') unit = 'tbsp'
    if (unit.startsWith('teaspoon') || unit === 'tsp') unit = 'tsp'
    if (unit.startsWith('ounce') || unit === 'oz') unit = 'oz'
    if (unit.startsWith('pound') || unit.startsWith('lb')) unit = 'lb'
    if (unit.startsWith('gram') || unit === 'g') unit = 'g'
    if (unit.startsWith('kilogram') || unit === 'kg') unit = 'kg'

    rest = rest.slice(unitMatch[0].length)
  }

  // Check for notes in parentheses at end
  const notesMatch = rest.match(/\s*\(([^)]+)\)\s*$/)
  let notes: string | undefined

  if (notesMatch) {
    notes = notesMatch[1]
    rest = rest.slice(0, -notesMatch[0].length)
  }

  // Also check for notes after comma
  const commaMatch = rest.match(/,\s*(.+)$/)
  if (commaMatch && !notes) {
    notes = commaMatch[1]
    rest = rest.slice(0, -commaMatch[0].length)
  }

  return {
    amount,
    unit,
    item: rest.trim(),
    notes,
  }
}
