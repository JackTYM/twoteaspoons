import { eq } from 'drizzle-orm'
import {
  db,
  recipes,
  ingredients,
  instructions,
  recipeSlugHistory,
  recipeCategories,
} from '../../../../db'
import { requireAuth } from '../../../../utils/session'
import { resolveRecipeBySlug } from '../../../../utils/recipeResolver'
import { getUniqueSlug } from '../../../../utils/slug'

interface UpdateRecipeBody {
  title?: string
  description?: string
  coverPhoto?: string
  prepTime?: number
  cookTime?: number
  servings?: number
  isPublished?: boolean
  sourceUrl?: string
  sourceAuthor?: string
  sourceSite?: string
  updateSlug?: boolean // If true, regenerate slug from new title
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
  const username = getRouterParam(event, 'username')
  const slug = getRouterParam(event, 'slug')
  const body = await readBody<UpdateRecipeBody>(event)

  if (!username || !slug) {
    throw createError({
      statusCode: 400,
      message: 'Username and slug are required',
    })
  }

  // Find the recipe
  const result = await resolveRecipeBySlug(username, slug)

  if (!result) {
    throw createError({
      statusCode: 404,
      message: 'Recipe not found',
    })
  }

  const existing = result.recipe

  // Check ownership
  if (existing.userId !== user.id) {
    throw createError({
      statusCode: 403,
      message: 'You can only edit your own recipes',
    })
  }

  // Helper to convert empty/invalid values to null for integer fields
  const toIntOrNull = (value: unknown): number | null => {
    if (value === undefined || value === null || value === '') return null
    const num = typeof value === 'number' ? value : Number(value)
    return Number.isNaN(num) ? null : num
  }

  // Determine the new slug
  let newSlug = existing.slug
  if (body.title && body.updateSlug) {
    newSlug = await getUniqueSlug(user.id, body.title, existing.id)
  }

  // If slug is changing, save the old slug to history for redirects
  if (newSlug !== existing.slug) {
    await db.insert(recipeSlugHistory).values({
      recipeId: existing.id,
      slug: existing.slug,
    })
  }

  // Update recipe
  const [updated] = await db
    .update(recipes)
    .set({
      title: body.title ?? existing.title,
      slug: newSlug,
      description: body.description || null,
      coverPhoto: body.coverPhoto || null,
      prepTime: toIntOrNull(body.prepTime),
      cookTime: toIntOrNull(body.cookTime),
      servings: toIntOrNull(body.servings) ?? existing.servings,
      isPublished: body.isPublished ?? existing.isPublished,
      sourceUrl: body.sourceUrl || null,
      sourceAuthor: body.sourceAuthor || null,
      sourceSite: body.sourceSite || null,
      updatedAt: new Date(),
    })
    .where(eq(recipes.id, existing.id))
    .returning()

  // Replace ingredients if provided
  if (body.ingredients) {
    await db.delete(ingredients).where(eq(ingredients.recipeId, existing.id))
    if (body.ingredients.length) {
      await db.insert(ingredients).values(
        body.ingredients.map((ing, index) => ({
          recipeId: existing.id,
          amount: ing.amount ? String(ing.amount) : null,
          unit: ing.unit || null,
          item: ing.item,
          notes: ing.notes || null,
          sortOrder: index,
        }))
      )
    }
  }

  // Replace instructions if provided
  if (body.instructions) {
    await db.delete(instructions).where(eq(instructions.recipeId, existing.id))
    if (body.instructions.length) {
      await db.insert(instructions).values(
        body.instructions.map((inst, index) => ({
          recipeId: existing.id,
          stepNumber: index + 1,
          content: inst.content,
          timerMinutes: inst.timerMinutes,
          ingredientIds: inst.ingredientIds?.length
            ? JSON.stringify(inst.ingredientIds)
            : null,
        }))
      )
    }
  }

  // Replace categories if provided
  if (body.categoryIds !== undefined) {
    await db.delete(recipeCategories).where(eq(recipeCategories.recipeId, existing.id))
    if (body.categoryIds.length) {
      await db.insert(recipeCategories).values(
        body.categoryIds.map(categoryId => ({
          recipeId: existing.id,
          categoryId,
        }))
      )
    }
  }

  // Return updated recipe with new slug for redirect
  return {
    recipe: updated,
    slugChanged: newSlug !== existing.slug,
    newSlug,
  }
})
