/**
 * Consolidate ingredients from multiple recipes into a shopping list
 */

interface IngredientInput {
  amount: string | null
  unit: string | null
  item: string
  recipeId?: number
  recipeName?: string
}

interface ConsolidatedIngredient {
  item: string
  totalAmount: string
  unit: string | null
  section: string
  recipes: string[]
}

// Store sections for grouping
const sectionKeywords: Record<string, string[]> = {
  produce: [
    'apple', 'banana', 'orange', 'lemon', 'lime', 'onion', 'garlic', 'ginger',
    'tomato', 'potato', 'carrot', 'celery', 'lettuce', 'spinach', 'kale',
    'broccoli', 'cauliflower', 'pepper', 'cucumber', 'zucchini', 'squash',
    'mushroom', 'avocado', 'herb', 'basil', 'cilantro', 'parsley', 'mint',
    'thyme', 'rosemary', 'sage', 'dill', 'chive', 'scallion', 'leek',
    'cabbage', 'corn', 'pea', 'bean', 'asparagus', 'eggplant', 'beet',
  ],
  dairy: [
    'milk', 'cream', 'butter', 'cheese', 'yogurt', 'sour cream', 'egg',
    'parmesan', 'mozzarella', 'cheddar', 'feta', 'ricotta', 'cottage',
  ],
  meat: [
    'chicken', 'beef', 'pork', 'lamb', 'turkey', 'bacon', 'sausage',
    'ham', 'steak', 'ground', 'roast', 'chop', 'wing', 'thigh', 'breast',
  ],
  seafood: [
    'fish', 'salmon', 'tuna', 'shrimp', 'crab', 'lobster', 'scallop',
    'cod', 'tilapia', 'halibut', 'trout', 'anchov',
  ],
  bakery: [
    'bread', 'bun', 'roll', 'bagel', 'croissant', 'tortilla', 'pita',
    'naan', 'baguette',
  ],
  frozen: [
    'frozen', 'ice cream',
  ],
  pantry: [
    'flour', 'sugar', 'salt', 'pepper', 'oil', 'vinegar', 'soy sauce',
    'rice', 'pasta', 'noodle', 'cereal', 'oat', 'quinoa', 'bean', 'lentil',
    'can', 'broth', 'stock', 'sauce', 'tomato paste', 'honey', 'maple',
    'vanilla', 'baking', 'yeast', 'cocoa', 'chocolate', 'nut', 'seed',
    'spice', 'cumin', 'paprika', 'cinnamon', 'nutmeg', 'oregano', 'curry',
  ],
  beverages: [
    'juice', 'soda', 'water', 'tea', 'coffee', 'wine', 'beer',
  ],
}

/**
 * Determine store section for an ingredient
 */
function getSection(item: string): string {
  const lowerItem = item.toLowerCase()

  for (const [section, keywords] of Object.entries(sectionKeywords)) {
    for (const keyword of keywords) {
      if (lowerItem.includes(keyword)) {
        return section
      }
    }
  }

  return 'other'
}

/**
 * Normalize ingredient names for comparison
 */
function normalizeItem(item: string): string {
  return item
    .toLowerCase()
    .trim()
    // Remove common descriptors
    .replace(/\b(fresh|dried|chopped|diced|minced|sliced|whole|large|medium|small)\b/g, '')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Convert amount string to number
 */
function parseAmount(amount: string | null): number {
  if (!amount) return 0

  // Handle fractions like "1/2", "3/4"
  if (amount.includes('/')) {
    const parts = amount.split('/')
    if (parts.length === 2 && parts[0] && parts[1]) {
      const num = parseFloat(parts[0])
      const denom = parseFloat(parts[1])
      if (!isNaN(num) && !isNaN(denom) && denom !== 0) {
        return num / denom
      }
    }
  }

  // Handle mixed numbers like "1 1/2"
  const mixedMatch = amount.match(/(\d+)\s+(\d+)\/(\d+)/)
  if (mixedMatch && mixedMatch[1] && mixedMatch[2] && mixedMatch[3]) {
    const whole = parseFloat(mixedMatch[1])
    const num = parseFloat(mixedMatch[2])
    const denom = parseFloat(mixedMatch[3])
    if (!isNaN(whole) && !isNaN(num) && !isNaN(denom) && denom !== 0) {
      return whole + num / denom
    }
  }

  // Handle ranges like "1-2" (take average)
  if (amount.includes('-')) {
    const parts = amount.split('-')
    if (parts.length === 2 && parts[0] && parts[1]) {
      const min = parseFloat(parts[0])
      const max = parseFloat(parts[1])
      if (!isNaN(min) && !isNaN(max)) {
        return (min + max) / 2
      }
    }
  }

  const num = parseFloat(amount)
  return isNaN(num) ? 0 : num
}

/**
 * Format a number as a nice amount string
 */
function formatAmount(num: number): string {
  if (num === 0) return ''

  // Handle common fractions
  const fractions: [number, string][] = [
    [0.25, '¼'],
    [0.33, '⅓'],
    [0.5, '½'],
    [0.67, '⅔'],
    [0.75, '¾'],
  ]

  const whole = Math.floor(num)
  const frac = num - whole

  for (const [val, symbol] of fractions) {
    if (Math.abs(frac - val) < 0.05) {
      return whole > 0 ? `${whole} ${symbol}` : symbol
    }
  }

  // Round to one decimal
  const rounded = Math.round(num * 10) / 10
  return rounded === Math.floor(rounded) ? String(Math.floor(rounded)) : rounded.toFixed(1)
}

/**
 * Check if two units are compatible for adding
 */
function unitsCompatible(unit1: string | null, unit2: string | null): boolean {
  if (unit1 === unit2) return true
  if (!unit1 || !unit2) return !unit1 && !unit2

  const u1 = unit1.toLowerCase()
  const u2 = unit2.toLowerCase()

  // Volume units that can be combined
  const volumeUnits = ['tsp', 'tbsp', 'cup', 'ml', 'l']
  // Weight units that can be combined
  const weightUnits = ['oz', 'lb', 'g', 'kg']

  const isVolume1 = volumeUnits.includes(u1)
  const isVolume2 = volumeUnits.includes(u2)
  const isWeight1 = weightUnits.includes(u1)
  const isWeight2 = weightUnits.includes(u2)

  return (isVolume1 && isVolume2) || (isWeight1 && isWeight2)
}

/**
 * Convert to base unit for combining (cups for volume, oz for weight)
 */
function toBaseUnit(amount: number, unit: string | null): { amount: number; unit: string | null } {
  if (!unit) return { amount, unit }

  const u = unit.toLowerCase()

  // Convert volume to cups
  const toCups: Record<string, number> = {
    tsp: 1 / 48,
    tbsp: 1 / 16,
    cup: 1,
    ml: 1 / 236.588,
    l: 4.22675,
  }

  // Convert weight to oz
  const toOz: Record<string, number> = {
    oz: 1,
    lb: 16,
    g: 0.035274,
    kg: 35.274,
  }

  if (toCups[u]) {
    return { amount: amount * toCups[u], unit: 'cup' }
  }
  if (toOz[u]) {
    return { amount: amount * toOz[u], unit: 'oz' }
  }

  return { amount, unit }
}

/**
 * Consolidate a list of ingredients
 */
export function consolidateIngredients(ingredients: IngredientInput[]): ConsolidatedIngredient[] {
  const consolidated = new Map<string, {
    amounts: Array<{ amount: number; unit: string | null }>
    recipes: Set<string>
    originalItem: string
  }>()

  for (const ing of ingredients) {
    const key = normalizeItem(ing.item)
    const amount = parseAmount(ing.amount)

    if (!consolidated.has(key)) {
      consolidated.set(key, {
        amounts: [],
        recipes: new Set(),
        originalItem: ing.item,
      })
    }

    const entry = consolidated.get(key)!
    entry.amounts.push({ amount, unit: ing.unit })
    if (ing.recipeName) {
      entry.recipes.add(ing.recipeName)
    }
  }

  const result: ConsolidatedIngredient[] = []

  for (const [, entry] of consolidated) {
    // Try to combine amounts if units are compatible
    let totalAmount = 0
    let finalUnit: string | null = null
    let canCombine = true

    // Check if all units are compatible
    const firstUnit = entry.amounts[0]?.unit ?? null
    for (const a of entry.amounts) {
      if (!unitsCompatible(firstUnit, a.unit ?? null)) {
        canCombine = false
        break
      }
    }

    if (canCombine && entry.amounts.length > 0) {
      // Convert all to base unit and sum
      for (const a of entry.amounts) {
        const converted = toBaseUnit(a.amount, a.unit)
        totalAmount += converted.amount
        finalUnit = converted.unit
      }
    } else {
      // Can't combine - just take first amount
      totalAmount = entry.amounts[0]?.amount || 0
      finalUnit = entry.amounts[0]?.unit || null
    }

    result.push({
      item: entry.originalItem,
      totalAmount: formatAmount(totalAmount),
      unit: finalUnit,
      section: getSection(entry.originalItem),
      recipes: Array.from(entry.recipes),
    })
  }

  // Sort by section, then by item name
  const sectionOrder = ['produce', 'dairy', 'meat', 'seafood', 'bakery', 'frozen', 'pantry', 'beverages', 'other']
  result.sort((a, b) => {
    const sectionDiff = sectionOrder.indexOf(a.section) - sectionOrder.indexOf(b.section)
    if (sectionDiff !== 0) return sectionDiff
    return a.item.localeCompare(b.item)
  })

  return result
}
