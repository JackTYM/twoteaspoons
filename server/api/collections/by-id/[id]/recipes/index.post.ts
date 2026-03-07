import { eq, and, sql } from 'drizzle-orm'
import { db, collections, collectionRecipes, recipes } from '../../../../../db'
import { requireAuth } from '../../../../../utils/session'

interface AddRecipeBody {
  recipeId: number
  recipeIds?: number[] // Support batch adding
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const idOrSlug = getRouterParam(event, 'id')
  const body = await readBody<AddRecipeBody>(event)

  if (!idOrSlug) {
    throw createError({
      statusCode: 400,
      message: 'Collection ID or slug required',
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

  // Check if it's a numeric ID or a slug
  const numericId = Number(idOrSlug)
  const isNumeric = !isNaN(numericId)

  // Check collection exists and user owns it
  const collection = await db.query.collections.findFirst({
    where: isNumeric
      ? eq(collections.id, numericId)
      : and(eq(collections.slug, idOrSlug), eq(collections.userId, user.id)),
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
