import { eq, and } from 'drizzle-orm'
import { db, collections, collectionRecipes } from '../../../../../db'
import { requireAuth } from '../../../../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const param = getRouterParam(event, 'id')
  const recipeId = Number(getRouterParam(event, 'recipeId'))

  if (!param || isNaN(recipeId)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid ID',
    })
  }

  // Check if param is numeric (ID) or string (slug)
  const isNumericId = /^\d+$/.test(param)

  // Find the collection
  let collection
  if (isNumericId) {
    collection = await db.query.collections.findFirst({
      where: eq(collections.id, Number(param)),
    })
  } else {
    // Slug lookup - find user's collection by slug
    collection = await db.query.collections.findFirst({
      where: and(eq(collections.userId, user.id), eq(collections.slug, param)),
    })
  }

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
      eq(collectionRecipes.collectionId, collection.id),
      eq(collectionRecipes.recipeId, recipeId)
    )
  )

  return { success: true }
})
