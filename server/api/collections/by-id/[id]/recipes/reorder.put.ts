import { eq, and } from 'drizzle-orm'
import { db, collections, collectionRecipes } from '../../../../../db'
import { requireAuth } from '../../../../../utils/session'

interface ReorderBody {
  recipes: Array<{ recipeId: number; sortOrder: number }>
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const param = getRouterParam(event, 'id')
  const body = await readBody<ReorderBody>(event)

  if (!param) {
    throw createError({
      statusCode: 400,
      message: 'Collection ID or slug is required',
    })
  }

  if (!body.recipes || !Array.isArray(body.recipes)) {
    throw createError({
      statusCode: 400,
      message: 'Recipes array is required',
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
      message: 'You can only reorder recipes in your own collections',
    })
  }

  // Update sort orders
  await Promise.all(
    body.recipes.map(async ({ recipeId, sortOrder }) => {
      await db
        .update(collectionRecipes)
        .set({ sortOrder })
        .where(
          and(
            eq(collectionRecipes.collectionId, collection.id),
            eq(collectionRecipes.recipeId, recipeId)
          )
        )
    })
  )

  return { success: true }
})
