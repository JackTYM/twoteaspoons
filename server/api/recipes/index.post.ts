import { db, recipes, ingredients, instructions, recipeCategories } from '../../db'
import { requireAuth } from '../../utils/session'
import { getUniqueSlug } from '../../utils/slug'

interface CreateRecipeBody {
  title: string
  description?: string
  coverPhoto?: string
  prepTime?: number
  cookTime?: number
  servings?: number
  isPublished?: boolean
  sourceUrl?: string
  sourceAuthor?: string
  sourceSite?: string
  categoryIds?: number[]
  ingredients?: Array<{
    amount?: number | string
    unit?: string
    item: string
    notes?: string
  }>
  instructions?: Array<{
    content: string
    timerMinutes?: number
    ingredientIds?: number[]
  }>
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody<CreateRecipeBody>(event)

  if (!body.title) {
    throw createError({
      statusCode: 400,
      message: 'Title is required',
    })
  }

  // Helper to convert empty/invalid values to null for integer fields
  // Handles: undefined, null, empty string, NaN
  const toIntOrNull = (value: unknown): number | null => {
    if (value === undefined || value === null || value === '') return null
    const num = typeof value === 'number' ? value : Number(value)
    return Number.isNaN(num) ? null : num
  }

  // Generate unique slug for the recipe
  const slug = await getUniqueSlug(user.id, body.title)

  // Insert recipe
  const [newRecipe] = await db
    .insert(recipes)
    .values({
      userId: user.id,
      title: body.title,
      slug,
      description: body.description || null,
      coverPhoto: body.coverPhoto || null,
      prepTime: toIntOrNull(body.prepTime),
      cookTime: toIntOrNull(body.cookTime),
      servings: toIntOrNull(body.servings) || 4,
      isPublished: body.isPublished ?? true,
      sourceUrl: body.sourceUrl || null,
      sourceAuthor: body.sourceAuthor || null,
      sourceSite: body.sourceSite || null,
    })
    .returning()

  if (!newRecipe) {
    throw createError({
      statusCode: 500,
      message: 'Failed to create recipe',
    })
  }

  // Insert ingredients
  if (body.ingredients?.length) {
    await db.insert(ingredients).values(
      body.ingredients.map((ing, index) => ({
        recipeId: newRecipe.id,
        amount: ing.amount ? String(ing.amount) : null,
        unit: ing.unit || null,
        item: ing.item,
        notes: ing.notes || null,
        sortOrder: index,
      }))
    )
  }

  // Insert instructions
  if (body.instructions?.length) {
    await db.insert(instructions).values(
      body.instructions.map((inst, index) => ({
        recipeId: newRecipe.id,
        stepNumber: index + 1,
        content: inst.content,
        timerMinutes: inst.timerMinutes,
        ingredientIds: inst.ingredientIds?.length
          ? JSON.stringify(inst.ingredientIds)
          : null,
      }))
    )
  }

  // Insert categories
  if (body.categoryIds?.length) {
    await db.insert(recipeCategories).values(
      body.categoryIds.map(categoryId => ({
        recipeId: newRecipe.id,
        categoryId,
      }))
    )
  }

  // Return recipe with author info for proper URL generation
  return {
    recipe: {
      ...newRecipe,
      author: {
        username: user.username,
      },
    },
  }
})
