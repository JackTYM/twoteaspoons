import { eq, and, asc } from 'drizzle-orm'
import { db, collections, collectionRecipes, recipes, ingredients } from '../../../../db'
import { getAuthUser, requireAuth } from '../../../../utils/session'

/**
 * Get collection by ID (numeric) or slug (string).
 * - If numeric: legacy ID lookup, returns data directly
 * - If string: slug lookup for current user's collection
 */
export default defineEventHandler(async (event) => {
  const param = getRouterParam(event, 'id')

  if (!param) {
    throw createError({
      statusCode: 400,
      message: 'Collection ID or slug is required',
    })
  }

  // Check if param is numeric (legacy ID) or string (slug)
  const isNumericId = /^\d+$/.test(param)

  if (isNumericId) {
    // Legacy numeric ID lookup
    const user = await getAuthUser(event)
    const id = Number(param)

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

    // Return the collection data (same format as slug endpoint)
    const collectionRecipeLinks = await db.query.collectionRecipes.findMany({
      where: eq(collectionRecipes.collectionId, collection.id),
      orderBy: [asc(collectionRecipes.sortOrder), asc(collectionRecipes.addedAt)],
    })

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

    const validRecipes = recipeList.filter(Boolean)

    return {
      collection,
      recipes: validRecipes,
      isOwner,
    }
  } else {
    // Slug lookup - requires auth since this is for user's own collections
    const user = await requireAuth(event)
    const slug = param

    const collection = await db.query.collections.findFirst({
      where: and(eq(collections.userId, user.id), eq(collections.slug, slug)),
    })

    if (!collection) {
      throw createError({
        statusCode: 404,
        message: 'Collection not found',
      })
    }

    // Get recipes in this collection
    const collectionRecipeLinks = await db.query.collectionRecipes.findMany({
      where: eq(collectionRecipes.collectionId, collection.id),
      orderBy: [asc(collectionRecipes.sortOrder), asc(collectionRecipes.addedAt)],
    })

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

    const validRecipes = recipeList.filter(Boolean)

    return {
      collection,
      recipes: validRecipes,
      isOwner: true,
    }
  }
})
