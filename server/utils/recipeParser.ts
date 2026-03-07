import * as cheerio from 'cheerio'

export interface ParsedInstruction {
  content: string
  timerMinutes?: number
}

export interface ParsedRecipe {
  title: string
  description?: string
  image?: string
  prepTime?: number
  cookTime?: number
  totalTime?: number
  servings?: number
  ingredients: string[]
  instructions: ParsedInstruction[]
  sourceUrl: string
  sourceAuthor?: string
  sourceSite?: string
}

/**
 * Decode HTML entities like &#39; &amp; &quot; etc.
 */
function decodeHtmlEntities(str: string): string {
  if (!str) return str

  // Named entities
  const namedEntities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&apos;': "'",
    '&nbsp;': ' ',
    '&mdash;': '—',
    '&ndash;': '–',
    '&ldquo;': '\u201C', // "
    '&rdquo;': '\u201D', // "
    '&lsquo;': '\u2018', // '
    '&rsquo;': '\u2019', // '
    '&hellip;': '…',
    '&deg;': '°',
    '&frac12;': '½',
    '&frac14;': '¼',
    '&frac34;': '¾',
  }

  let result = str

  // Decode named entities
  for (const [entity, char] of Object.entries(namedEntities)) {
    result = result.replace(new RegExp(entity, 'gi'), char)
  }

  // Decode numeric entities (&#39; &#x27; etc.)
  result = result.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
  result = result.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))

  return result
}

/**
 * Extract timer minutes from instruction text
 * Prioritizes explicit timer-setting patterns over general time mentions
 * Returns the first/primary timer found, or undefined if none
 */
function extractTimerFromText(text: string): number | undefined {
  // Helper to convert time value to minutes
  function toMinutes(value: number, unit: string): number {
    if (unit.includes('hour')) return value * 60
    if (unit.includes('second')) return Math.max(1, Math.ceil(value / 60))
    return value
  }

  // PRIORITY 1: Explicit timer patterns - "set a timer for X minutes", "timer for X"
  const timerPatterns = [
    /(?:set\s+(?:a\s+)?timer|timer)\s+(?:for\s+)?(\d+)\s*(minutes?|hours?|seconds?)/i,
  ]

  for (const pattern of timerPatterns) {
    const match = text.match(pattern)
    if (match && match[1] && match[2]) {
      return toMinutes(parseInt(match[1], 10), match[2].toLowerCase())
    }
  }

  // PRIORITY 2: Active cooking patterns - "cook/bake/simmer/etc for X minutes"
  const cookingPatterns = [
    /(?:cook|bake|roast|simmer|boil|fry|sauté|saute|grill|broil|steam|microwave|heat)\s+(?:for\s+)?(?:about\s+)?(\d+)\s*(?:to|-)\s*(\d+)\s*(minutes?|hours?|seconds?)/i,
    /(?:cook|bake|roast|simmer|boil|fry|sauté|saute|grill|broil|steam|microwave|heat)\s+(?:for\s+)?(?:about\s+)?(\d+)\s*(minutes?|hours?|seconds?)/i,
  ]

  for (const pattern of cookingPatterns) {
    const match = text.match(pattern)
    if (match) {
      // Check if it's a range pattern (has 3 groups) or single (has 2 groups)
      if (match[3] && match[2]) {
        // Range: use the higher value
        return toMinutes(parseInt(match[2], 10), match[3].toLowerCase())
      } else if (match[2] && match[1]) {
        // Single value
        return toMinutes(parseInt(match[1], 10), match[2].toLowerCase())
      }
    }
  }

  // PRIORITY 3: "for X minutes" pattern (but not "allow X minutes")
  const forPattern = /\bfor\s+(?:about\s+)?(\d+)\s*(?:to|-)\s*(\d+)\s*(minutes?|hours?|seconds?)/i
  const forSinglePattern = /\bfor\s+(?:about\s+)?(\d+)\s*(minutes?|hours?|seconds?)/i

  let match = text.match(forPattern)
  if (match && match[2] && match[3]) {
    return toMinutes(parseInt(match[2], 10), match[3].toLowerCase())
  }

  match = text.match(forSinglePattern)
  if (match && match[1] && match[2]) {
    return toMinutes(parseInt(match[1], 10), match[2].toLowerCase())
  }

  // PRIORITY 4: General time mentions (fallback) - but skip "allow X minutes" type patterns
  // Only use if no higher priority pattern matched
  const generalPattern = /(?<!allow\s+)(\d+)\s*(?:to|-)\s*(\d+)\s*(minutes?|hours?|seconds?)/i
  const generalSinglePattern = /(?<!allow\s+)(\d+)\s*(minutes?|hours?|seconds?)/i

  match = text.match(generalPattern)
  if (match && match[2] && match[3]) {
    return toMinutes(parseInt(match[2], 10), match[3].toLowerCase())
  }

  match = text.match(generalSinglePattern)
  if (match && match[1] && match[2]) {
    return toMinutes(parseInt(match[1], 10), match[2].toLowerCase())
  }

  return undefined
}

interface HowToStep {
  '@type'?: string
  text?: string
  name?: string
  itemListElement?: HowToStep[]
}

interface JsonLdRecipe {
  '@type'?: string | string[]
  name?: string
  description?: string
  image?: string | string[] | { url?: string } | Array<{ url?: string }>
  prepTime?: string
  cookTime?: string
  totalTime?: string
  recipeYield?: string | number | string[]
  recipeIngredient?: string[]
  recipeInstructions?: Array<string | HowToStep> | string
  author?: string | { name?: string; '@type'?: string } | Array<{ name?: string }>
}

/**
 * Parse ISO 8601 duration (PT30M, PT1H30M, PT45S, P1D) to minutes
 */
function parseDuration(duration: string | undefined): number | undefined {
  if (!duration || typeof duration !== 'string') return undefined

  // Handle PT format: PT1H30M45S
  const ptMatch = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (ptMatch && (ptMatch[1] || ptMatch[2] || ptMatch[3])) {
    const hours = parseInt(ptMatch[1] || '0', 10)
    const minutes = parseInt(ptMatch[2] || '0', 10)
    const seconds = parseInt(ptMatch[3] || '0', 10)
    return hours * 60 + minutes + Math.round(seconds / 60)
  }

  // Handle P format with days: P1DT2H (1 day, 2 hours)
  const pMatch = duration.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/)
  if (pMatch && (pMatch[1] || pMatch[2] || pMatch[3])) {
    const days = parseInt(pMatch[1] || '0', 10)
    const hours = parseInt(pMatch[2] || '0', 10)
    const minutes = parseInt(pMatch[3] || '0', 10)
    return days * 24 * 60 + hours * 60 + minutes
  }

  // Try to extract just numbers (e.g., "30 minutes", "1 hour")
  const numMatch = duration.match(/(\d+)\s*(hour|hr|minute|min)/i)
  if (numMatch && numMatch[1] && numMatch[2]) {
    const num = parseInt(numMatch[1], 10)
    const unit = numMatch[2].toLowerCase()
    if (unit.startsWith('hour') || unit === 'hr') return num * 60
    return num
  }

  return undefined
}

/**
 * Parse servings from various formats
 */
function parseServings(yield_: string | number | string[] | undefined): number | undefined {
  if (!yield_) return undefined
  if (typeof yield_ === 'number') return yield_

  // Handle array format (take first element)
  if (Array.isArray(yield_)) {
    yield_ = yield_[0]
    if (!yield_) return undefined
  }

  // Try to extract number
  const match = yield_.match(/(\d+)/)
  return match && match[1] ? parseInt(match[1], 10) : undefined
}

/**
 * Extract image URL from various formats
 */
function extractImage(image: string | string[] | { url?: string } | Array<{ url?: string }> | undefined): string | undefined {
  if (!image) return undefined
  if (typeof image === 'string') return image
  if (Array.isArray(image)) {
    const first = image[0]
    if (typeof first === 'string') return first
    if (typeof first === 'object' && first?.url) return first.url
    return undefined
  }
  if (typeof image === 'object' && 'url' in image && image.url) return image.url
  return undefined
}

/**
 * Extract author name from various formats
 */
function extractAuthor(author: string | { name?: string; '@type'?: string } | Array<{ name?: string }> | undefined): string | undefined {
  if (!author) return undefined
  if (typeof author === 'string') return author
  if (Array.isArray(author)) {
    const first = author[0]
    if (first?.name) return first.name
    return undefined
  }
  if (typeof author === 'object' && author.name) return author.name
  return undefined
}

/**
 * Parse instructions from various formats including HowToStep, HowToSection
 * Returns structured instructions with decoded HTML entities and extracted timers
 */
function parseInstructions(instructions: Array<string | HowToStep> | string | undefined): ParsedInstruction[] {
  if (!instructions) return []

  // Handle single string (some sites do this)
  if (typeof instructions === 'string') {
    // Split by newlines or numbered patterns
    return instructions
      .split(/\n+|\d+\.\s+/)
      .map(s => decodeHtmlEntities(s.trim()))
      .filter(s => s.length > 10)
      .map(content => ({
        content,
        timerMinutes: extractTimerFromText(content),
      }))
  }

  if (!Array.isArray(instructions)) return []

  const rawTexts: string[] = []
  const seen = new Set<string>() // Deduplicate

  function extractStepText(step: string | HowToStep): void {
    if (typeof step === 'string') {
      const trimmed = decodeHtmlEntities(step.trim())
      if (trimmed && trimmed.length > 5 && !seen.has(trimmed)) {
        seen.add(trimmed)
        rawTexts.push(trimmed)
      }
      return
    }

    if (typeof step === 'object') {
      // HowToSection - has nested itemListElement
      if (step.itemListElement && Array.isArray(step.itemListElement)) {
        for (const subStep of step.itemListElement) {
          extractStepText(subStep)
        }
        return
      }

      // HowToStep - prefer 'text' over 'name' (name is often a title, not instruction)
      const text = step.text
      if (text && text.length > 10) {
        const decoded = decodeHtmlEntities(text.trim())
        if (!seen.has(decoded)) {
          seen.add(decoded)
          rawTexts.push(decoded)
        }
      }
    }
  }

  for (const inst of instructions) {
    extractStepText(inst)
  }

  // Filter out garbage and convert to ParsedInstruction objects
  return rawTexts
    .filter(text => {
      // Skip if too short to be a real instruction
      if (text.length < 15) return false
      // Skip if it looks like metadata (all caps, company names, etc.)
      if (/^[A-Z\s]+$/.test(text) && text.length < 50) return false
      // Skip if it's just a brand/company name pattern
      if (/^(Dotdash|Meredith|Food Studios|Getty|iStock)/i.test(text)) return false
      return true
    })
    .map(content => ({
      content,
      timerMinutes: extractTimerFromText(content),
    }))
}

/**
 * Recursively search for a Recipe object in JSON-LD data
 */
function findRecipeInData(data: unknown): JsonLdRecipe | null {
  if (!data || typeof data !== 'object') return null

  // Check if this is a Recipe
  const obj = data as Record<string, unknown>
  const type = obj['@type']
  if (type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))) {
    return obj as unknown as JsonLdRecipe
  }

  // Check @graph array
  if (Array.isArray(obj['@graph'])) {
    for (const item of obj['@graph']) {
      const found = findRecipeInData(item)
      if (found) return found
    }
  }

  // Check if root is an array
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findRecipeInData(item)
      if (found) return found
    }
  }

  return null
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
      const recipe = findRecipeInData(data)

      if (recipe) {
        console.log('[recipeParser] Found JSON-LD recipe:', {
          name: recipe.name,
          prepTime: recipe.prepTime,
          cookTime: recipe.cookTime,
          author: recipe.author,
          yield: recipe.recipeYield,
        })

        return {
          title: decodeHtmlEntities(recipe.name || 'Untitled Recipe'),
          description: recipe.description ? decodeHtmlEntities(recipe.description) : undefined,
          image: extractImage(recipe.image),
          prepTime: parseDuration(recipe.prepTime),
          cookTime: parseDuration(recipe.cookTime),
          totalTime: parseDuration(recipe.totalTime),
          servings: parseServings(recipe.recipeYield),
          ingredients: (recipe.recipeIngredient || []).map(ing => decodeHtmlEntities(ing)),
          instructions: parseInstructions(recipe.recipeInstructions),
          sourceUrl: '',
          sourceAuthor: recipe.author ? decodeHtmlEntities(extractAuthor(recipe.author) || '') : undefined,
        }
      }
    } catch (err) {
      console.warn('[recipeParser] Failed to parse JSON-LD:', err)
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

  const rawInstructions = getItemPropAll('recipeInstructions')

  return {
    title: decodeHtmlEntities(title),
    description: getItemProp('description') ? decodeHtmlEntities(getItemProp('description')!) : undefined,
    image: recipeElement.find('[itemprop="image"]').attr('src') ||
           recipeElement.find('[itemprop="image"]').attr('content'),
    prepTime: parseDuration(getItemProp('prepTime')),
    cookTime: parseDuration(getItemProp('cookTime')),
    totalTime: parseDuration(getItemProp('totalTime')),
    servings: parseServings(getItemProp('recipeYield')),
    ingredients: getItemPropAll('recipeIngredient').map(ing => decodeHtmlEntities(ing)),
    instructions: rawInstructions.map(text => {
      const content = decodeHtmlEntities(text)
      return { content, timerMinutes: extractTimerFromText(content) }
    }),
    sourceUrl: '',
    sourceAuthor: getItemProp('author') ? decodeHtmlEntities(getItemProp('author')!) : undefined,
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
    title: decodeHtmlEntities(title),
    description: description ? decodeHtmlEntities(description) : undefined,
    image,
    ingredients: ingredients.map(ing => decodeHtmlEntities(ing)),
    instructions: instructions.map(text => {
      const content = decodeHtmlEntities(text)
      return { content, timerMinutes: extractTimerFromText(content) }
    }),
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
 * Convert unicode fractions to ASCII fractions
 */
function normalizeUnicodeFractions(str: string): string {
  const fractionMap: Record<string, string> = {
    '½': '1/2',
    '⅓': '1/3',
    '⅔': '2/3',
    '¼': '1/4',
    '¾': '3/4',
    '⅕': '1/5',
    '⅖': '2/5',
    '⅗': '3/5',
    '⅘': '4/5',
    '⅙': '1/6',
    '⅚': '5/6',
    '⅛': '1/8',
    '⅜': '3/8',
    '⅝': '5/8',
    '⅞': '7/8',
  }
  let result = str
  for (const [unicode, ascii] of Object.entries(fractionMap)) {
    result = result.replace(new RegExp(unicode, 'g'), ascii)
  }
  return result
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
  // "½ medium onion"
  // "3 large eggs"
  // "1 (14 oz) can diced tomatoes"

  // Normalize unicode fractions first
  const str = normalizeUnicodeFractions(ingredientStr.trim())

  // Match amount at start - try patterns in order of specificity:
  // 1. Mixed number: "1 1/2"
  // 2. Fraction: "1/2"
  // 3. Decimal: "1.5"
  // 4. Whole number: "1"
  // 5. Range versions of above: "1-2", "1/2-1"
  const amountPatterns = [
    /^(\d+\s+\d+\/\d+)(\s*-\s*\d+\s+\d+\/\d+)?\s+/,  // Mixed: "1 1/2" or "1 1/2-2 1/2"
    /^(\d+\/\d+)(\s*-\s*\d+\/\d+)?\s+/,              // Fraction: "1/2" or "1/2-3/4"
    /^(\d+\.\d+)(\s*-\s*\d+\.?\d*)?\s+/,            // Decimal: "1.5" or "1.5-2"
    /^(\d+)(\s*-\s*\d+)?\s+/,                        // Whole: "1" or "1-2"
  ]

  let amount: string | undefined
  let rest = str

  for (const pattern of amountPatterns) {
    const match = str.match(pattern)
    if (match) {
      // Combine the main amount and optional range
      amount = (match[1] + (match[2] || '')).trim()
      rest = str.slice(match[0].length)
      break
    }
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
