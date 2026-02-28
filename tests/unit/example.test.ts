import { describe, it, expect } from 'vitest'

describe('Example Unit Test', () => {
  it('should pass a basic assertion', () => {
    expect(1 + 1).toBe(2)
  })

  it('should work with arrays', () => {
    const items = ['apple', 'banana', 'cherry']
    expect(items).toHaveLength(3)
    expect(items).toContain('banana')
  })

  it('should work with objects', () => {
    const recipe = {
      title: 'Test Recipe',
      servings: 4,
    }
    expect(recipe).toHaveProperty('title')
    expect(recipe.servings).toBeGreaterThan(0)
  })
})
