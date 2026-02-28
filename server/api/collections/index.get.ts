import { eq, desc, sql } from 'drizzle-orm'
import { db, collections, collectionRecipes } from '../../db'
import { getAuthUser } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event)
  const query = getQuery(event)

  // Can view public collections or own collections
  const userId = query.userId as string | undefined

  let collectionList

  if (userId) {
    // Viewing specific user's collections - only public ones unless it's the current user
    if (user?.id === userId) {
      collectionList = await db.query.collections.findMany({
        where: eq(collections.userId, userId),
        orderBy: [desc(collections.createdAt)],
      })
    } else {
      collectionList = await db.query.collections.findMany({
        where: sql`${collections.userId} = ${userId} AND ${collections.isPublic} = true`,
        orderBy: [desc(collections.createdAt)],
      })
    }
  } else if (user) {
    // Current user's collections
    collectionList = await db.query.collections.findMany({
      where: eq(collections.userId, user.id),
      orderBy: [desc(collections.createdAt)],
    })
  } else {
    // No user - return empty
    return { collections: [] }
  }

  // Get recipe counts for each collection
  const collectionsWithCounts = await Promise.all(
    collectionList.map(async (collection) => {
      const recipes = await db.query.collectionRecipes.findMany({
        where: eq(collectionRecipes.collectionId, collection.id),
      })
      return {
        ...collection,
        recipeCount: recipes.length,
      }
    })
  )

  return { collections: collectionsWithCounts }
})
