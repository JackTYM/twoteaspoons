import { eq, and } from 'drizzle-orm'
import { db, collections, collectionRecipes } from '../../../../db'
import { requireAuth } from '../../../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const collectionId = Number(getRouterParam(event, 'id'))
  const recipeId = Number(getRouterParam(event, 'recipeId'))

  if (isNaN(collectionId) || isNaN(recipeId)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid ID',
    })
  }

  // Check collection exists and user owns it
  const collection = await db.query.collections.findFirst({
    where: eq(collections.id, collectionId),
  })

  if (!collection) {
    throw createError({
      statusCode: 404,
      message: 'Collection not found',
    })
  }

  if (collection.userId !== user.id) {
    throw createError({
      statusCode: 403,
      message: 'You can only remove recipes from your own collections',
    })
  }

  await db.delete(collectionRecipes).where(
    and(
      eq(collectionRecipes.collectionId, collectionId),
      eq(collectionRecipes.recipeId, recipeId)
    )
  )

  return { success: true }
})
