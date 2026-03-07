/**
 * Composable for validating that partial ingredient amounts sum to totals
 */

interface IngredientInput {
  id: string
  amount: string
  unit: string
  item: string
  notes: string
}

interface IngredientLink {
  id: number
  amount?: string | null
  unit?: string | null
}

interface InstructionInput {
  id: string
  content: string
  timerMinutes: number | null
  ingredientLinks: IngredientLink[]
}

export interface AmountValidationResult {
  ingredientIndex: number
  ingredientItem: string
  totalAmount: number
  linkedAmount: number
  unit: string
  difference: number
  isOverLinked: boolean
  isUnderLinked: boolean
  stepsUsed: number[]
}

/**
 * Parse amount string to number (handles fractions and mixed numbers)
 */
function parseAmount(amount: string | null | undefined): number {
  if (!amount) return 0

  const trimmed = amount.trim()

  // Handle mixed numbers like "1 1/2"
  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (mixedMatch && mixedMatch[1] && mixedMatch[2] && mixedMatch[3]) {
    const whole = parseFloat(mixedMatch[1])
    const num = parseFloat(mixedMatch[2])
    const denom = parseFloat(mixedMatch[3])
    if (!isNaN(whole) && !isNaN(num) && !isNaN(denom) && denom !== 0) {
      return whole + num / denom
    }
  }

  // Handle simple fractions like "1/2", "3/4"
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/')
    if (parts.length === 2 && parts[0] && parts[1]) {
      const num = parseFloat(parts[0])
      const denom = parseFloat(parts[1])
      if (!isNaN(num) && !isNaN(denom) && denom !== 0) {
        return num / denom
      }
    }
  }

  // Handle ranges like "1-2" (take average)
  if (trimmed.includes('-') && !trimmed.startsWith('-')) {
    const parts = trimmed.split('-')
    if (parts.length === 2 && parts[0] && parts[1]) {
      const min = parseFloat(parts[0])
      const max = parseFloat(parts[1])
      if (!isNaN(min) && !isNaN(max)) {
        return (min + max) / 2
      }
    }
  }

  // Handle Unicode fractions
  const fractionMap: Record<string, number> = {
    '¼': 0.25,
    '½': 0.5,
    '¾': 0.75,
    '⅓': 1 / 3,
    '⅔': 2 / 3,
    '⅛': 0.125,
    '⅜': 0.375,
    '⅝': 0.625,
    '⅞': 0.875,
  }

  // Check for whole number + unicode fraction like "1 ½"
  for (const [frac, value] of Object.entries(fractionMap)) {
    if (trimmed.includes(frac)) {
      const wholeMatch = trimmed.match(/^(\d+)\s*/)
      const whole = wholeMatch?.[1] ? parseFloat(wholeMatch[1]) : 0
      return whole + value
    }
  }

  const num = parseFloat(trimmed)
  return isNaN(num) ? 0 : num
}

/**
 * Format a number as a nice amount string
 */
export function formatAmount(num: number): string {
  if (num === 0) return ''

  const fractions: [number, string][] = [
    [0.125, '⅛'],
    [0.25, '¼'],
    [0.33, '⅓'],
    [0.375, '⅜'],
    [0.5, '½'],
    [0.625, '⅝'],
    [0.67, '⅔'],
    [0.75, '¾'],
    [0.875, '⅞'],
  ]

  const whole = Math.floor(num)
  const frac = num - whole

  for (const [val, symbol] of fractions) {
    if (Math.abs(frac - val) < 0.05) {
      return whole > 0 ? `${whole} ${symbol}` : symbol
    }
  }

  const rounded = Math.round(num * 10) / 10
  return rounded === Math.floor(rounded) ? String(Math.floor(rounded)) : rounded.toFixed(1)
}

/**
 * Normalize unit for comparison
 */
function normalizeUnit(unit: string | null | undefined): string {
  if (!unit) return ''
  return unit.toLowerCase().trim()
}

/**
 * Check if two units are compatible (same or convertible)
 */
function unitsMatch(unit1: string | null | undefined, unit2: string | null | undefined): boolean {
  const u1 = normalizeUnit(unit1)
  const u2 = normalizeUnit(unit2)

  if (u1 === u2) return true
  if (!u1 || !u2) return !u1 && !u2

  // Common unit aliases
  const aliases: Record<string, string[]> = {
    tsp: ['tsp', 'teaspoon', 'teaspoons', 't'],
    tbsp: ['tbsp', 'tablespoon', 'tablespoons', 'tb', 'T'],
    cup: ['cup', 'cups', 'c'],
    oz: ['oz', 'ounce', 'ounces'],
    lb: ['lb', 'lbs', 'pound', 'pounds'],
    g: ['g', 'gram', 'grams'],
    kg: ['kg', 'kilogram', 'kilograms'],
    ml: ['ml', 'milliliter', 'milliliters'],
    l: ['l', 'liter', 'liters'],
  }

  for (const [, unitList] of Object.entries(aliases)) {
    const has1 = unitList.includes(u1)
    const has2 = unitList.includes(u2)
    if (has1 && has2) return true
  }

  return false
}

interface UseIngredientAmountValidation {
  validateAmounts: (
    ingredients: IngredientInput[],
    instructions: InstructionInput[]
  ) => AmountValidationResult[]
  hasValidationWarnings: (results: AmountValidationResult[]) => boolean
  getWarnings: (results: AmountValidationResult[]) => AmountValidationResult[]
  parseAmount: (amount: string | null | undefined) => number
  formatAmount: (num: number) => string
}

export function useIngredientAmountValidation(): UseIngredientAmountValidation {
  /**
   * Validate that partial amounts linked to instructions sum to ingredient totals
   */
  function validateAmounts(
    ingredients: IngredientInput[],
    instructions: InstructionInput[]
  ): AmountValidationResult[] {
    const results: AmountValidationResult[] = []

    // For each ingredient, check if linked amounts sum correctly
    ingredients.forEach((ingredient, ingredientIndex) => {
      if (!ingredient.item.trim()) return

      const totalAmount = parseAmount(ingredient.amount)
      const ingredientUnit = normalizeUnit(ingredient.unit)

      // Skip ingredients with no amount
      if (totalAmount === 0) return

      // Find all links to this ingredient
      let linkedAmount = 0
      const stepsUsed: number[] = []
      let hasPartialLinks = false

      instructions.forEach((instruction, stepIndex) => {
        const links = instruction.ingredientLinks || []
        const link = links.find((l) => l.id === ingredientIndex)

        if (link) {
          stepsUsed.push(stepIndex)

          // If link has a specific amount, add it
          if (link.amount) {
            hasPartialLinks = true
            const linkAmount = parseAmount(link.amount)

            // Check unit compatibility
            const linkUnit = normalizeUnit(link.unit)
            if (linkUnit && ingredientUnit && !unitsMatch(linkUnit, ingredientUnit)) {
              // Unit mismatch - skip adding but flag
              console.warn(
                `Unit mismatch for ${ingredient.item}: link has ${link.unit}, ingredient has ${ingredient.unit}`
              )
            } else {
              linkedAmount += linkAmount
            }
          }
        }
      })

      // Only validate if there are partial links (not just whole-amount links)
      if (!hasPartialLinks) return

      const difference = totalAmount - linkedAmount
      const tolerance = 0.01 // Allow small floating point differences

      results.push({
        ingredientIndex,
        ingredientItem: ingredient.item,
        totalAmount,
        linkedAmount,
        unit: ingredient.unit || '',
        difference,
        isOverLinked: linkedAmount > totalAmount + tolerance,
        isUnderLinked: linkedAmount < totalAmount - tolerance,
        stepsUsed,
      })
    })

    return results
  }

  /**
   * Check if any validation results have warnings
   */
  function hasValidationWarnings(results: AmountValidationResult[]): boolean {
    return results.some((r) => r.isOverLinked || r.isUnderLinked)
  }

  /**
   * Get only the results that have issues
   */
  function getWarnings(results: AmountValidationResult[]): AmountValidationResult[] {
    return results.filter((r) => r.isOverLinked || r.isUnderLinked)
  }

  return {
    validateAmounts,
    hasValidationWarnings,
    getWarnings,
    parseAmount,
    formatAmount,
  }
}
