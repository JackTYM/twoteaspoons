import { eq, sql, and } from 'drizzle-orm'
import { db, favorites, recipes } from '../../../../db'
import { requireAuth } from '../../../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const recipeId = parseInt(getRouterParam(event, 'id') || '', 10)
  if (isNaN(recipeId)) {
    throw createError({ statusCode: 400, message: 'Invalid recipe ID' })
  }

  // Check if saved
  const [existing] = await db
    .select({ recipeId: favorites.recipeId })
    .from(favorites)
    .where(
      and(
        eq(favorites.userId, user.id),
        eq(favorites.recipeId, recipeId)
      )
    )
    .limit(1)

  if (!existing) {
    // Not saved, return success
    return { saved: false, message: 'Recipe was not saved' }
  }

  // Remove from favorites
  await db
    .delete(favorites)
    .where(
      and(
        eq(favorites.userId, user.id),
        eq(favorites.recipeId, recipeId)
      )
    )

  // Decrement save count on recipe (ensure it doesn't go below 0)
  await db
    .update(recipes)
    .set({
      saveCount: sql`GREATEST(COALESCE(${recipes.saveCount}, 0) - 1, 0)`,
    })
    .where(eq(recipes.id, recipeId))

  return { saved: false, message: 'Recipe unsaved' }
})
