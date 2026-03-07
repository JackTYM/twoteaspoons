import { eq, and } from 'drizzle-orm'
import { db, collections, collectionRecipes, users } from '../../../../../db'
import { requireAuth } from '../../../../../utils/session'

interface ReorderBody {
  recipes: Array<{ recipeId: number; sortOrder: number }>
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const username = getRouterParam(event, 'username')
  const slug = getRouterParam(event, 'slug')
  const body = await readBody<ReorderBody>(event)

  if (!username || !slug) {
    throw createError({
      statusCode: 400,
      message: 'Username and slug are required',
    })
  }

  if (!body.recipes || !Array.isArray(body.recipes)) {
    throw createError({
      statusCode: 400,
      message: 'Recipes array is required',
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
