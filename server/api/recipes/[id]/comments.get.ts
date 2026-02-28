import { eq, desc } from 'drizzle-orm'
import { db, comments, recipes } from '../../../db'
import { getAuthUser } from '../../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event)
  const recipeId = Number(getRouterParam(event, 'id'))

  if (isNaN(recipeId)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid recipe ID',
    })
  }

  // Check recipe exists and is accessible
  const recipe = await db.query.recipes.findFirst({
    where: eq(recipes.id, recipeId),
  })

  if (!recipe) {
    throw createError({
      statusCode: 404,
      message: 'Recipe not found',
    })
  }

  if (!recipe.isPublished && recipe.userId !== user?.id) {
    throw createError({
      statusCode: 404,
      message: 'Recipe not found',
    })
  }

  // Get comments with user info
  const commentList = await db.query.comments.findMany({
    where: eq(comments.recipeId, recipeId),
    orderBy: [desc(comments.createdAt)],
    with: {
      user: true,
    },
  })

  // Calculate average ratings
  const ratingsWithTaste = commentList.filter(c => c.tasteRating !== null)
  const ratingsWithDifficulty = commentList.filter(c => c.difficultyRating !== null)

  const avgTaste = ratingsWithTaste.length > 0
    ? ratingsWithTaste.reduce((sum, c) => sum + (c.tasteRating || 0), 0) / ratingsWithTaste.length
    : null

  const avgDifficulty = ratingsWithDifficulty.length > 0
    ? ratingsWithDifficulty.reduce((sum, c) => sum + (c.difficultyRating || 0), 0) / ratingsWithDifficulty.length
    : null

  return {
    comments: commentList,
    stats: {
      totalComments: commentList.length,
      avgTasteRating: avgTaste ? Math.round(avgTaste * 10) / 10 : null,
      avgDifficultyRating: avgDifficulty ? Math.round(avgDifficulty * 10) / 10 : null,
      tasteRatingCount: ratingsWithTaste.length,
      difficultyRatingCount: ratingsWithDifficulty.length,
    },
  }
})
