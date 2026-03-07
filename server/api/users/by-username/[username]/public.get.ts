import { eq, sql, and, desc, inArray } from 'drizzle-orm'
import { db, users, recipes, collections, collectionRecipes } from '../../../../db'

/**
 * GET /api/users/:username/public
 * Returns public profile data for a user.
 */
export default defineEventHandler(async (event) => {
  const username = getRouterParam(event, 'username')

  if (!username) {
    throw createError({ statusCode: 400, message: 'Username is required' })
  }

  // Find user by username
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      avatar: users.avatar,
      bio: users.bio,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.username, username))
    .limit(1)

  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  // Get public recipes with save count
  const publicRecipes = await db
    .select({
      id: recipes.id,
      slug: recipes.slug,
      title: recipes.title,
      description: recipes.description,
      coverPhoto: recipes.coverPhoto,
      prepTime: recipes.prepTime,
      cookTime: recipes.cookTime,
      servings: recipes.servings,
      saveCount: recipes.saveCount,
      createdAt: recipes.createdAt,
    })
    .from(recipes)
    .where(and(eq(recipes.userId, user.id), eq(recipes.isPublished, true)))
    .orderBy(desc(recipes.createdAt))

  // Get public collections with recipe count
  const publicCollections = await db
    .select({
      id: collections.id,
      name: collections.name,
      slug: collections.slug,
      description: collections.description,
      coverPhoto: collections.coverPhoto,
      createdAt: collections.createdAt,
    })
    .from(collections)
    .where(and(eq(collections.userId, user.id), eq(collections.isPublic, true)))
    .orderBy(desc(collections.createdAt))

  // Get recipe counts for each collection
  const collectionIds = publicCollections.map((c) => c.id)
  let collectionRecipeCounts: Record<number, number> = {}

  if (collectionIds.length > 0) {
    const counts = await db
      .select({
        collectionId: collectionRecipes.collectionId,
        count: sql<number>`count(*)::int`,
      })
      .from(collectionRecipes)
      .where(inArray(collectionRecipes.collectionId, collectionIds))
      .groupBy(collectionRecipes.collectionId)

    collectionRecipeCounts = Object.fromEntries(counts.map((c) => [c.collectionId, c.count]))
  }

  // Calculate total saves received (sum of save counts on all user's recipes)
  const [savesResult] = await db
    .select({
      totalSaves: sql<number>`COALESCE(SUM(${recipes.saveCount}), 0)::int`,
    })
    .from(recipes)
    .where(eq(recipes.userId, user.id))

  // Get collection preview photos (first 4 recipe photos per collection)
  const collectionsWithPreviews = await Promise.all(
    publicCollections.map(async (collection) => {
      const previewRecipes = await db
        .select({
          coverPhoto: recipes.coverPhoto,
        })
        .from(collectionRecipes)
        .innerJoin(recipes, eq(collectionRecipes.recipeId, recipes.id))
        .where(eq(collectionRecipes.collectionId, collection.id))
        .limit(4)

      return {
        ...collection,
        recipeCount: collectionRecipeCounts[collection.id] || 0,
        previewPhotos: previewRecipes
          .map((r) => r.coverPhoto)
          .filter((p): p is string => p !== null),
      }
    })
  )

  return {
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
      joinedAt: user.createdAt?.toISOString(),
    },
    stats: {
      recipeCount: publicRecipes.length,
      collectionCount: publicCollections.length,
      totalSavesReceived: savesResult?.totalSaves || 0,
    },
    recipes: publicRecipes.map((r) => ({
      ...r,
      createdAt: r.createdAt?.toISOString(),
      author: {
        name: user.name,
        username: user.username,
      },
    })),
    collections: collectionsWithPreviews.map((c) => ({
      ...c,
      createdAt: c.createdAt?.toISOString(),
    })),
  }
})
