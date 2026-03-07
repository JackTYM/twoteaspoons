import { eq } from 'drizzle-orm'
import { db, comments, recipes } from '../../../../../db'
import { requireAuth } from '../../../../../utils/session'
import { resolveRecipeBySlug } from '../../../../../utils/recipeResolver'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const username = getRouterParam(event, 'username')
  const slug = getRouterParam(event, 'slug')
  const commentId = Number(getRouterParam(event, 'commentId'))

  if (!username || !slug) {
    throw createError({
      statusCode: 400,
      message: 'Username and slug are required',
    })
  }

  if (isNaN(commentId)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid comment ID',
    })
  }

  // Find the recipe
  const result = await resolveRecipeBySlug(username, slug)

  if (!result) {
    throw createError({
      statusCode: 404,
      message: 'Recipe not found',
    })
  }

  const recipe = result.recipe

  // Get comment
  const comment = await db.query.comments.findFirst({
    where: eq(comments.id, commentId),
  })

  if (!comment || comment.recipeId !== recipe.id) {
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
    where: eq(comments.recipeId, recipe.id),
  })

  const ratingsWithTaste = allComments.filter((c) => c.tasteRating !== null)
  const ratingsWithDifficulty = allComments.filter(
    (c) => c.difficultyRating !== null
  )

  const avgTaste =
    ratingsWithTaste.length > 0
      ? ratingsWithTaste.reduce((sum, c) => sum + (c.tasteRating || 0), 0) /
        ratingsWithTaste.length
      : null

  const avgDifficulty =
    ratingsWithDifficulty.length > 0
      ? ratingsWithDifficulty.reduce(
          (sum, c) => sum + (c.difficultyRating || 0),
          0
        ) / ratingsWithDifficulty.length
      : null

  await db
    .update(recipes)
    .set({
      avgTasteRating: avgTaste?.toFixed(2) || null,
      avgDifficultyRating: avgDifficulty?.toFixed(2) || null,
      ratingCount: Math.max(
        ratingsWithTaste.length,
        ratingsWithDifficulty.length
      ),
    })
    .where(eq(recipes.id, recipe.id))

  return { success: true }
})
