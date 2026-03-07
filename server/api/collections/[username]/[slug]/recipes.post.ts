import { eq, and, sql } from 'drizzle-orm'
import { db, collections, collectionRecipes, recipes, users } from '../../../../db'
import { requireAuth } from '../../../../utils/session'

interface AddRecipeBody {
  recipeId: number
  recipeIds?: number[] // Support batch adding
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const username = getRouterParam(event, 'username')
  const slug = getRouterParam(event, 'slug')
  const body = await readBody<AddRecipeBody>(event)

  if (!username || !slug) {
    throw createError({
      statusCode: 400,
      message: 'Username and slug are required',
    })
  }

  // Support both single recipeId and batch recipeIds
  const recipeIds = body.recipeIds || (body.recipeId ? [body.recipeId] : [])

  if (recipeIds.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'Recipe ID(s) required',
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
      message: 'You can only add recipes to your own collections',
    })
  }

  // Get current max sortOrder
  const maxOrderResult = await db
    .select({ maxOrder: sql<number>`COALESCE(MAX(${collectionRecipes.sortOrder}), -1)` })
    .from(collectionRecipes)
    .where(eq(collectionRecipes.collectionId, collection.id))

  let nextOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1

  // Add each recipe
  const addedRecipeIds: number[] = []
  for (const recipeId of recipeIds) {
    // Check recipe exists
    const recipe = await db.query.recipes.findFirst({
      where: eq(recipes.id, recipeId),
    })

    if (!recipe) {
      continue // Skip non-existent recipes
    }

    // Check if already in collection
    const existing = await db.query.collectionRecipes.findFirst({
      where: and(
        eq(collectionRecipes.collectionId, collection.id),
        eq(collectionRecipes.recipeId, recipeId)
      ),
    })

    if (!existing) {
      await db.insert(collectionRecipes).values({
        collectionId: collection.id,
        recipeId,
        sortOrder: nextOrder++,
      })
      addedRecipeIds.push(recipeId)
    }
  }

  return { success: true, addedCount: addedRecipeIds.length, addedRecipeIds }
})
