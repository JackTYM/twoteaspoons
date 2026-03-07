import { eq, and, asc } from 'drizzle-orm'
import { db, collections, collectionRecipes, recipes, ingredients, users } from '../../../../db'
import { getAuthUser } from '../../../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event)
  const username = getRouterParam(event, 'username')
  const slug = getRouterParam(event, 'slug')

  if (!username || !slug) {
    throw createError({
      statusCode: 400,
      message: 'Username and slug are required',
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

  // Find the collection by owner and slug
  const collection = await db.query.collections.findFirst({
    where: and(eq(collections.userId, owner.id), eq(collections.slug, slug)),
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

  // Get recipes in this collection (ordered by sortOrder, then addedAt)
  const collectionRecipeLinks = await db.query.collectionRecipes.findMany({
    where: eq(collectionRecipes.collectionId, collection.id),
    orderBy: [asc(collectionRecipes.sortOrder), asc(collectionRecipes.addedAt)],
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
