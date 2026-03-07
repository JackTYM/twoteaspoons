import { eq } from 'drizzle-orm'
import { db, recipes } from '../../../../db'
import { requireAuth } from '../../../../utils/session'
import { resolveRecipeBySlug } from '../../../../utils/recipeResolver'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const username = getRouterParam(event, 'username')
  const slug = getRouterParam(event, 'slug')

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
      message: 'You can only delete your own recipes',
    })
  }

  await db.delete(recipes).where(eq(recipes.id, existing.id))

  return { success: true }
})
