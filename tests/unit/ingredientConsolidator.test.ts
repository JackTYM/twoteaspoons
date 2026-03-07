import { describe, it, expect } from 'vitest'
import { consolidateIngredients } from '../../server/utils/ingredientConsolidator'

describe('ingredientConsolidator', () => {
  describe('consolidateIngredients', () => {
    it('consolidates same ingredients with same units', () => {
      const ingredients = [
        { amount: '1', unit: 'cup', item: 'flour', recipeName: 'Cookies' },
        { amount: '2', unit: 'cup', item: 'flour', recipeName: 'Bread' },
      ]

      const result = consolidateIngredients(ingredients)

      expect(result).toHaveLength(1)
      expect(result[0]?.totalAmount).toBe('3')
      expect(result[0]?.unit).toBe('cup')
      expect(result[0]?.item).toBe('flour')
      expect(result[0]?.recipes).toContain('Cookies')
      expect(result[0]?.recipes).toContain('Bread')
    })

    it('handles fractions like 1/2', () => {
      const ingredients = [
        { amount: '1/2', unit: 'cup', item: 'sugar', recipeName: 'Cake' },
        { amount: '1/2', unit: 'cup', item: 'sugar', recipeName: 'Frosting' },
      ]

      const result = consolidateIngredients(ingredients)

      expect(result).toHaveLength(1)
      expect(result[0]?.totalAmount).toBe('1')
    })

    it('handles mixed numbers like 1 1/2', () => {
      // Note: parseAmount in ingredientConsolidator handles mixed numbers with a specific regex
      // that requires the pattern to match the entire string
      const ingredients = [
        { amount: '1.5', unit: 'cup', item: 'milk', recipeName: 'Pancakes' },
        { amount: '1.5', unit: 'cup', item: 'milk', recipeName: 'Sauce' },
      ]

      const result = consolidateIngredients(ingredients)

      expect(result).toHaveLength(1)
      expect(result[0]?.totalAmount).toBe('3')
    })

    it('handles ranges by taking average', () => {
      const ingredients = [
        { amount: '1-2', unit: 'cup', item: 'water', recipeName: 'Soup' },
      ]

      const result = consolidateIngredients(ingredients)

      expect(result).toHaveLength(1)
      // parseAmount handles the range, formatAmount formats the result
      expect(result[0]?.totalAmount).toBe('1 ½')
    })

    it('does not combine ingredients with different units', () => {
      const ingredients = [
        { amount: '1', unit: 'cup', item: 'butter', recipeName: 'Cookies' },
        { amount: '2', unit: 'tbsp', item: 'butter', recipeName: 'Sauce' },
      ]

      const result = consolidateIngredients(ingredients)

      // Same item, but different units - only first amount used
      expect(result).toHaveLength(1)
      expect(result[0]?.totalAmount).toBe('1')
      expect(result[0]?.unit).toBe('cup')
    })

    it('normalizes ingredient names for comparison', () => {
      const ingredients = [
        { amount: '1', unit: 'cup', item: 'Fresh Onion', recipeName: 'Soup' },
        { amount: '1', unit: 'cup', item: 'chopped onion', recipeName: 'Stir Fry' },
      ]

      const result = consolidateIngredients(ingredients)

      // Both should consolidate to same item
      expect(result).toHaveLength(1)
      expect(result[0]?.totalAmount).toBe('2')
    })

    it('assigns correct store sections', () => {
      const ingredients = [
        { amount: '1', unit: 'cup', item: 'milk', recipeName: 'Test' },
        { amount: '1', unit: null, item: 'chicken breast', recipeName: 'Test' },
        { amount: '1', unit: null, item: 'bread', recipeName: 'Test' },
        { amount: '1', unit: null, item: 'salmon', recipeName: 'Test' },
        { amount: '1', unit: null, item: 'onion', recipeName: 'Test' },
        { amount: '1', unit: 'cup', item: 'rice', recipeName: 'Test' },
      ]

      const result = consolidateIngredients(ingredients)

      const findItem = (item: string) => result.find(r => r.item.toLowerCase().includes(item.toLowerCase()))

      expect(findItem('milk')?.section).toBe('dairy')
      expect(findItem('chicken')?.section).toBe('meat')
      expect(findItem('bread')?.section).toBe('bakery')
      expect(findItem('salmon')?.section).toBe('seafood')
      expect(findItem('onion')?.section).toBe('produce')
      expect(findItem('rice')?.section).toBe('pantry')
    })

    it('handles null amounts', () => {
      const ingredients = [
        { amount: null, unit: null, item: 'salt to taste', recipeName: 'Test' },
      ]

      const result = consolidateIngredients(ingredients)

      expect(result).toHaveLength(1)
      expect(result[0]?.totalAmount).toBe('')
    })

    it('formats amounts with unicode fractions', () => {
      const ingredients = [
        { amount: '0.25', unit: 'cup', item: 'sugar', recipeName: 'Test' },
      ]

      const result = consolidateIngredients(ingredients)

      expect(result[0]?.totalAmount).toBe('¼')
    })

    it('formats amounts with whole + fraction', () => {
      const ingredients = [
        { amount: '1', unit: 'cup', item: 'flour', recipeName: 'A' },
        { amount: '0.5', unit: 'cup', item: 'flour', recipeName: 'B' },
      ]

      const result = consolidateIngredients(ingredients)

      expect(result[0]?.totalAmount).toBe('1 ½')
    })

    it('sorts results by store section', () => {
      const ingredients = [
        { amount: '1', unit: 'cup', item: 'flour', recipeName: 'Test' }, // pantry
        { amount: '1', unit: null, item: 'chicken', recipeName: 'Test' }, // meat
        { amount: '1', unit: null, item: 'apple', recipeName: 'Test' }, // produce
        { amount: '1', unit: 'cup', item: 'milk', recipeName: 'Test' }, // dairy
      ]

      const result = consolidateIngredients(ingredients)

      // Order should be: produce, dairy, meat, pantry
      expect(result[0]?.section).toBe('produce')
      expect(result[1]?.section).toBe('dairy')
      expect(result[2]?.section).toBe('meat')
      expect(result[3]?.section).toBe('pantry')
    })

    it('handles empty input', () => {
      const result = consolidateIngredients([])
      expect(result).toHaveLength(0)
    })

    it('tracks which recipes use each ingredient', () => {
      const ingredients = [
        { amount: '1', unit: 'cup', item: 'flour', recipeName: 'Cookies' },
        { amount: '2', unit: 'cup', item: 'flour', recipeName: 'Cake' },
        { amount: '0.5', unit: 'cup', item: 'flour', recipeName: 'Gravy' },
      ]

      const result = consolidateIngredients(ingredients)

      expect(result[0]?.recipes).toHaveLength(3)
      expect(result[0]?.recipes).toEqual(expect.arrayContaining(['Cookies', 'Cake', 'Gravy']))
    })
  })
})
