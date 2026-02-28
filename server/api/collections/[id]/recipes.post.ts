import { eq, and } from 'drizzle-orm'
import { db, collections, collectionRecipes, recipes } from '../../../db'
import { requireAuth } from '../../../utils/session'

interface AddRecipeBody {
  recipeId: number
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const collectionId = Number(getRouterParam(event, 'id'))
  const body = await readBody<AddRecipeBody>(event)

  if (isNaN(collectionId)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid collection ID',
    })
  }

  if (!body.recipeId) {
    throw createError({
      statusCode: 400,
      message: 'Recipe ID is required',
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
      message: 'You can only add recipes to your own collections',
    })
  }

  // Check recipe exists
  const recipe = await db.query.recipes.findFirst({
    where: eq(recipes.id, body.recipeId),
  })

  if (!recipe) {
    throw createError({
      statusCode: 404,
      message: 'Recipe not found',
    })
  }

  // Check if already in collection
  const existing = await db.query.collectionRecipes.findFirst({
    where: and(
      eq(collectionRecipes.collectionId, collectionId),
      eq(collectionRecipes.recipeId, body.recipeId)
    ),
  })

  if (existing) {
    return { success: true, message: 'Recipe already in collection' }
  }

  await db.insert(collectionRecipes).values({
    collectionId,
    recipeId: body.recipeId,
  })

  return { success: true }
})
