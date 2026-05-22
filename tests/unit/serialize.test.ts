import { describe, expect, it } from 'vitest'
import {
  serializeCategory,
  serializeIngredient,
  serializeRecipe,
  serializeUser,
} from '../../server/utils/serialize'

describe('server serialize utils', () => {
  it('maps a Drizzle recipe row to the snake_case recipe DTO', () => {
    const createdAt = new Date('2026-05-21T12:00:00.000Z')
    const updatedAt = new Date('2026-05-21T13:00:00.000Z')

    const recipe = serializeRecipe({
      id: 1,
      userId: 'user-1',
      title: 'Ramen',
      slug: 'ramen',
      description: 'Rich broth',
      coverPhoto: 'https://example.com/ramen.jpg',
      prepTime: 20,
      cookTime: 180,
      servings: 4,
      isPublished: true,
      sourceUrl: null,
      sourceAuthor: null,
      sourceSite: null,
      forkedFromId: 99,
      avgTasteRating: '4.50',
      avgDifficultyRating: '3.25',
      ratingCount: 6,
      saveCount: 12,
      createdAt,
      updatedAt,
    })

    expect(recipe.user_id).toBe('user-1')
    expect(recipe.cover_photo).toBe('https://example.com/ramen.jpg')
    expect(recipe.forked_from_id).toBe(99)
    expect(recipe.created_at).toBe(createdAt.toISOString())
    expect(recipe.updated_at).toBe(updatedAt.toISOString())
  })

  it('maps a Drizzle ingredient row to the snake_case ingredient DTO', () => {
    const ingredient = serializeIngredient({
      id: 7,
      recipeId: 1,
      amount: '2',
      unit: 'cups',
      item: 'flour',
      notes: 'sifted',
      sortOrder: 3,
    })

    expect(ingredient.recipe_id).toBe(1)
    expect(ingredient.sort_order).toBe(3)
  })

  it('maps a Drizzle category row to the snake_case category DTO', () => {
    const category = serializeCategory({
      id: 4,
      name: 'Dinner',
      slug: 'dinner',
      icon: 'i-heroicons-moon',
      type: 'meal',
      sortOrder: 2,
    })

    expect(category.icon).toBe('i-heroicons-moon')
    expect(category.sort_order).toBe(2)
  })

  it('maps a Drizzle user row to the snake_case user DTO', () => {
    const createdAt = new Date('2026-05-21T12:00:00.000Z')
    const updatedAt = new Date('2026-05-21T13:00:00.000Z')

    const user = serializeUser({
      id: 'user-1',
      email: 'cook@example.com',
      name: 'Cook',
      username: 'cook',
      avatar: null,
      bio: 'Makes soup',
      createdAt,
      updatedAt,
    })

    expect(user.created_at).toBe(createdAt.toISOString())
    expect(user.updated_at).toBe(updatedAt.toISOString())
  })
})
