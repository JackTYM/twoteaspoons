import { eq, and } from 'drizzle-orm'
import { db, collections, collectionRecipes, users } from '../../../../../db'
import { requireAuth } from '../../../../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const username = getRouterParam(event, 'username')
  const slug = getRouterParam(event, 'slug')
  const recipeId = Number(getRouterParam(event, 'recipeId'))

  if (!username || !slug) {
    throw createError({
      statusCode: 400,
      message: 'Username and slug are required',
    })
  }

  if (isNaN(recipeId)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid recipe ID',
    })
  }

  // Find the collection owner by username
  const owner = await db.query.users.findFirst({
    where: eq(users.username, username),
  })

  if (!owner) {
    throw createError({
      statusCode: 404,
      message: 'Collection not found',
    })
  }

  // Find the collection
  const collection = await db.query.collections.findFirst({
    where: and(eq(collections.userId, owner.id), eq(collections.slug, slug)),
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
      eq(collectionRecipes.collectionId, collection.id),
      eq(collectionRecipes.recipeId, recipeId)
    )
  )

  return { success: true }
})
