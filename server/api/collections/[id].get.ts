import { eq, asc } from 'drizzle-orm'
import { db, collections, collectionRecipes, recipes, ingredients } from '../../db'
import { getAuthUser } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event)
  const id = Number(getRouterParam(event, 'id'))

  if (isNaN(id)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid collection ID',
    })
  }

  const collection = await db.query.collections.findFirst({
    where: eq(collections.id, id),
  })

  if (!collection) {
    throw createError({
      statusCode: 404,
      message: 'Collection not found',
    })
  }

  // Check access: must be public OR owned by current user
  const isOwner = user?.id === collection.userId
  if (!collection.isPublic && !isOwner) {
    throw createError({
      statusCode: 404,
      message: 'Collection not found',
    })
  }

  // Get recipes in this collection
  const collectionRecipeLinks = await db.query.collectionRecipes.findMany({
    where: eq(collectionRecipes.collectionId, id),
    orderBy: [asc(collectionRecipes.addedAt)],
  })

  // Fetch full recipe details
  const recipeList = await Promise.all(
    collectionRecipeLinks.map(async (link) => {
      const recipe = await db.query.recipes.findFirst({
        where: eq(recipes.id, link.recipeId),
        with: {
          author: true,
          ingredients: {
            orderBy: [asc(ingredients.sortOrder)],
          },
        },
      })
      return recipe
    })
  )

  // Filter out any null results
  const validRecipes = recipeList.filter(Boolean)

  return {
    collection,
    recipes: validRecipes,
    isOwner,
  }
})
