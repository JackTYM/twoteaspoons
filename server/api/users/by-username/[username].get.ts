import { desc, eq } from 'drizzle-orm'
import type { DbCollection, DbRecipe, DbUser } from '~/types/database'
import { collections, db, follows, recipes, users } from '../../../db'
import { serializeCollection, serializeRecipe, serializeUser } from '../../../utils/serialize'

interface UserProfile extends DbUser {
  recipe_count: number
  follower_count: number
  following_count: number
}

interface UserPublicProfile {
  user: UserProfile
  recipes: DbRecipe[]
  collections: DbCollection[]
}

export default defineEventHandler(async (event): Promise<UserPublicProfile | null> => {
  const username = getRouterParam(event, 'username')

  if (!username) {
    throw createError({
      statusCode: 400,
      message: 'username is required',
    })
  }

  const user = await db.query.users.findFirst({
    where: eq(users.username, username),
  })

  if (!user) {
    return null
  }

  const [
    recipeRows,
    collectionRows,
    followerRows,
    followingRows,
  ] = await Promise.all([
    db.query.recipes.findMany({
      where: (recipe, { and }) => and(eq(recipe.userId, user.id), eq(recipe.isPublished, true)),
      orderBy: desc(recipes.createdAt),
    }),
    db.query.collections.findMany({
      where: (collection, { and }) => and(eq(collection.userId, user.id), eq(collection.isPublic, true)),
      orderBy: desc(collections.createdAt),
    }),
    db.query.follows.findMany({
      columns: { followerId: true },
      where: eq(follows.followingId, user.id),
    }),
    db.query.follows.findMany({
      columns: { followingId: true },
      where: eq(follows.followerId, user.id),
    }),
  ])

  return {
    user: {
      ...serializeUser(user),
      recipe_count: recipeRows.length,
      follower_count: followerRows.length,
      following_count: followingRows.length,
    },
    recipes: recipeRows.map(serializeRecipe),
    collections: collectionRows.map(serializeCollection),
  }
})
