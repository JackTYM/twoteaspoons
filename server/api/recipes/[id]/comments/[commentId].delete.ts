import { eq } from 'drizzle-orm'
import { db, comments, recipes } from '../../../../db'
import { requireAuth } from '../../../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const recipeId = Number(getRouterParam(event, 'id'))
  const commentId = Number(getRouterParam(event, 'commentId'))

  if (isNaN(recipeId) || isNaN(commentId)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid ID',
    })
  }

  // Get comment
  const comment = await db.query.comments.findFirst({
    where: eq(comments.id, commentId),
  })

  if (!comment || comment.recipeId !== recipeId) {
    throw createError({
      statusCode: 404,
      message: 'Comment not found',
    })
  }

  // Check ownership
  if (comment.userId !== user.id) {
    throw createError({
      statusCode: 403,
      message: 'You can only delete your own comments',
    })
  }

  await db.delete(comments).where(eq(comments.id, commentId))

  // Update recipe aggregate ratings
  const allComments = await db.query.comments.findMany({
    where: eq(comments.recipeId, recipeId),
  })

  const ratingsWithTaste = allComments.filter(c => c.tasteRating !== null)
  const ratingsWithDifficulty = allComments.filter(c => c.difficultyRating !== null)

  const avgTaste = ratingsWithTaste.length > 0
    ? ratingsWithTaste.reduce((sum, c) => sum + (c.tasteRating || 0), 0) / ratingsWithTaste.length
    : null

  const avgDifficulty = ratingsWithDifficulty.length > 0
    ? ratingsWithDifficulty.reduce((sum, c) => sum + (c.difficultyRating || 0), 0) / ratingsWithDifficulty.length
    : null

  await db.update(recipes)
    .set({
      avgTasteRating: avgTaste?.toFixed(2) || null,
      avgDifficultyRating: avgDifficulty?.toFixed(2) || null,
      ratingCount: Math.max(ratingsWithTaste.length, ratingsWithDifficulty.length),
    })
    .where(eq(recipes.id, recipeId))

  return { success: true }
})
