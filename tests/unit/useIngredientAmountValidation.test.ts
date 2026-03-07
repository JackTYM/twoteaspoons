import { describe, it, expect } from 'vitest'
import { useIngredientAmountValidation, formatAmount } from '../../app/composables/useIngredientAmountValidation'

describe('useIngredientAmountValidation', () => {
  const { validateAmounts, hasValidationWarnings, getWarnings, parseAmount } = useIngredientAmountValidation()

  describe('parseAmount', () => {
    it('parses whole numbers', () => {
      expect(parseAmount('5')).toBe(5)
      expect(parseAmount('10')).toBe(10)
    })

    it('parses decimals', () => {
      expect(parseAmount('1.5')).toBe(1.5)
      expect(parseAmount('0.25')).toBe(0.25)
    })

    it('parses simple fractions', () => {
      expect(parseAmount('1/2')).toBe(0.5)
      expect(parseAmount('1/4')).toBe(0.25)
      expect(parseAmount('3/4')).toBe(0.75)
    })

    it('parses mixed numbers', () => {
      expect(parseAmount('1 1/2')).toBe(1.5)
      expect(parseAmount('2 1/4')).toBe(2.25)
    })

    it('parses ranges by taking average', () => {
      expect(parseAmount('1-2')).toBe(1.5)
      expect(parseAmount('2-4')).toBe(3)
    })

    it('parses unicode fractions', () => {
      expect(parseAmount('½')).toBe(0.5)
      expect(parseAmount('¼')).toBe(0.25)
      expect(parseAmount('¾')).toBe(0.75)
      expect(parseAmount('⅓')).toBeCloseTo(0.333, 2)
      expect(parseAmount('⅔')).toBeCloseTo(0.667, 2)
    })

    it('parses whole + unicode fraction', () => {
      expect(parseAmount('1 ½')).toBe(1.5)
      expect(parseAmount('2 ¼')).toBe(2.25)
    })

    it('handles null/undefined', () => {
      expect(parseAmount(null)).toBe(0)
      expect(parseAmount(undefined)).toBe(0)
    })

    it('handles empty string', () => {
      expect(parseAmount('')).toBe(0)
    })

    it('handles invalid input', () => {
      expect(parseAmount('abc')).toBe(0)
    })

    it('handles negative numbers in ranges', () => {
      // -2 should not be treated as a range
      expect(parseAmount('-2')).toBe(-2)
    })
  })

  describe('formatAmount', () => {
    it('formats whole numbers', () => {
      expect(formatAmount(1)).toBe('1')
      expect(formatAmount(5)).toBe('5')
    })

    it('formats common fractions as unicode', () => {
      expect(formatAmount(0.25)).toBe('¼')
      expect(formatAmount(0.5)).toBe('½')
      expect(formatAmount(0.75)).toBe('¾')
    })

    it('formats mixed numbers', () => {
      expect(formatAmount(1.5)).toBe('1 ½')
      expect(formatAmount(2.25)).toBe('2 ¼')
    })

    it('formats decimals close to common fractions', () => {
      // 1.7 is close to 1 2/3 (1.67), so it formats as unicode fraction
      expect(formatAmount(1.7)).toBe('1 ⅔')
      // 1.9 is close to 1 7/8 (1.875), so it formats as unicode fraction
      expect(formatAmount(1.9)).toBe('1 ⅞')
      // 1.15 is close to 1 1/8 (1.125), so it formats as unicode fraction
      expect(formatAmount(1.15)).toBe('1 ⅛')
      // Values that don't match any common fraction get decimal format
      expect(formatAmount(1.45)).toBe('1.5') // Rounds to 1.5 which becomes ½
    })

    it('formats zero as empty string', () => {
      expect(formatAmount(0)).toBe('')
    })
  })

  describe('validateAmounts', () => {
    const createIngredient = (id: string, amount: string, unit: string, item: string) => ({
      id,
      amount,
      unit,
      item,
      notes: '',
    })

    const createInstruction = (
      id: string,
      content: string,
      links: Array<{ id: number; amount?: string | null; unit?: string | null }>
    ) => ({
      id,
      content,
      timerMinutes: null,
      ingredientLinks: links,
    })

    it('validates correct partial amounts', () => {
      const ingredients = [
        createIngredient('1', '2', 'cup', 'flour'),
      ]
      const instructions = [
        createInstruction('1', 'Mix half', [{ id: 0, amount: '1', unit: 'cup' }]),
        createInstruction('2', 'Add rest', [{ id: 0, amount: '1', unit: 'cup' }]),
      ]

      const results = validateAmounts(ingredients, instructions)

      expect(results).toHaveLength(1)
      expect(results[0]?.isOverLinked).toBe(false)
      expect(results[0]?.isUnderLinked).toBe(false)
    })

    it('detects over-linked amounts', () => {
      const ingredients = [
        createIngredient('1', '1', 'cup', 'sugar'),
      ]
      const instructions = [
        createInstruction('1', 'Add some', [{ id: 0, amount: '1', unit: 'cup' }]),
        createInstruction('2', 'Add more', [{ id: 0, amount: '1', unit: 'cup' }]),
      ]

      const results = validateAmounts(ingredients, instructions)

      expect(results[0]?.isOverLinked).toBe(true)
      expect(results[0]?.linkedAmount).toBe(2)
      expect(results[0]?.totalAmount).toBe(1)
    })

    it('detects under-linked amounts', () => {
      const ingredients = [
        createIngredient('1', '2', 'cup', 'milk'),
      ]
      const instructions = [
        createInstruction('1', 'Use some', [{ id: 0, amount: '1', unit: 'cup' }]),
      ]

      const results = validateAmounts(ingredients, instructions)

      expect(results[0]?.isUnderLinked).toBe(true)
      expect(results[0]?.linkedAmount).toBe(1)
      expect(results[0]?.totalAmount).toBe(2)
    })

    it('tracks which steps use the ingredient', () => {
      const ingredients = [
        createIngredient('1', '3', 'cup', 'flour'),
      ]
      const instructions = [
        createInstruction('1', 'First', [{ id: 0, amount: '1', unit: 'cup' }]),
        createInstruction('2', 'Second', []),
        createInstruction('3', 'Third', [{ id: 0, amount: '2', unit: 'cup' }]),
      ]

      const results = validateAmounts(ingredients, instructions)

      expect(results[0]?.stepsUsed).toEqual([0, 2])
    })

    it('skips ingredients without amounts', () => {
      const ingredients = [
        createIngredient('1', '', '', 'salt to taste'),
      ]
      const instructions = [
        createInstruction('1', 'Season', [{ id: 0 }]),
      ]

      const results = validateAmounts(ingredients, instructions)

      expect(results).toHaveLength(0)
    })

    it('skips ingredients without partial links', () => {
      const ingredients = [
        createIngredient('1', '2', 'cup', 'flour'),
      ]
      const instructions = [
        createInstruction('1', 'Mix', [{ id: 0 }]), // No specific amount in link
      ]

      const results = validateAmounts(ingredients, instructions)

      expect(results).toHaveLength(0)
    })

    it('handles multiple ingredients', () => {
      const ingredients = [
        createIngredient('1', '2', 'cup', 'flour'),
        createIngredient('2', '1', 'cup', 'sugar'),
      ]
      const instructions = [
        createInstruction('1', 'Mix dry', [
          { id: 0, amount: '2', unit: 'cup' },
          { id: 1, amount: '0.5', unit: 'cup' },
        ]),
        createInstruction('2', 'Add rest', [
          { id: 1, amount: '0.5', unit: 'cup' },
        ]),
      ]

      const results = validateAmounts(ingredients, instructions)

      expect(results).toHaveLength(2)
      expect(results[0]?.ingredientItem).toBe('flour')
      expect(results[0]?.isOverLinked).toBe(false)
      expect(results[0]?.isUnderLinked).toBe(false)
      expect(results[1]?.ingredientItem).toBe('sugar')
      expect(results[1]?.isOverLinked).toBe(false)
      expect(results[1]?.isUnderLinked).toBe(false)
    })
  })

  describe('hasValidationWarnings', () => {
    it('returns false when no warnings', () => {
      const results = [
        { ingredientIndex: 0, ingredientItem: 'test', totalAmount: 1, linkedAmount: 1, unit: 'cup', difference: 0, isOverLinked: false, isUnderLinked: false, stepsUsed: [] },
      ]

      expect(hasValidationWarnings(results)).toBe(false)
    })

    it('returns true when over-linked', () => {
      const results = [
        { ingredientIndex: 0, ingredientItem: 'test', totalAmount: 1, linkedAmount: 2, unit: 'cup', difference: -1, isOverLinked: true, isUnderLinked: false, stepsUsed: [] },
      ]

      expect(hasValidationWarnings(results)).toBe(true)
    })

    it('returns true when under-linked', () => {
      const results = [
        { ingredientIndex: 0, ingredientItem: 'test', totalAmount: 2, linkedAmount: 1, unit: 'cup', difference: 1, isOverLinked: false, isUnderLinked: true, stepsUsed: [] },
      ]

      expect(hasValidationWarnings(results)).toBe(true)
    })
  })

  describe('getWarnings', () => {
    it('filters to only results with issues', () => {
      const results = [
        { ingredientIndex: 0, ingredientItem: 'ok', totalAmount: 1, linkedAmount: 1, unit: 'cup', difference: 0, isOverLinked: false, isUnderLinked: false, stepsUsed: [] },
        { ingredientIndex: 1, ingredientItem: 'over', totalAmount: 1, linkedAmount: 2, unit: 'cup', difference: -1, isOverLinked: true, isUnderLinked: false, stepsUsed: [] },
        { ingredientIndex: 2, ingredientItem: 'under', totalAmount: 2, linkedAmount: 1, unit: 'cup', difference: 1, isOverLinked: false, isUnderLinked: true, stepsUsed: [] },
      ]

      const warnings = getWarnings(results)

      expect(warnings).toHaveLength(2)
      expect(warnings[0]?.ingredientItem).toBe('over')
      expect(warnings[1]?.ingredientItem).toBe('under')
    })

    it('returns empty array when no warnings', () => {
      const results = [
        { ingredientIndex: 0, ingredientItem: 'ok', totalAmount: 1, linkedAmount: 1, unit: 'cup', difference: 0, isOverLinked: false, isUnderLinked: false, stepsUsed: [] },
      ]

      expect(getWarnings(results)).toHaveLength(0)
    })
  })
})
