import { eq, and } from 'drizzle-orm'
import { db, collectionRecipes, collections } from '../../../../db'
import { requireAuth } from '../../../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const recipeId = parseInt(getRouterParam(event, 'id') || '', 10)

  if (!recipeId || isNaN(recipeId)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid recipe ID',
    })
  }

  // Get all collection IDs where this recipe is present
  // AND the collection belongs to the current user
  const results = await db
    .select({ collectionId: collectionRecipes.collectionId })
    .from(collectionRecipes)
    .innerJoin(collections, eq(collections.id, collectionRecipes.collectionId))
    .where(
      and(
        eq(collectionRecipes.recipeId, recipeId),
        eq(collections.userId, user.id)
      )
    )

  return {
    collectionIds: results.map(r => r.collectionId),
  }
})
