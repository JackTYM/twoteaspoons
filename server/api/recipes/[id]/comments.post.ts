import { eq } from 'drizzle-orm'
import { db, comments, recipes } from '../../../db'
import { requireAuth } from '../../../utils/session'

interface CreateCommentBody {
  content: string
  photo?: string
  tasteRating?: number
  difficultyRating?: number
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const recipeId = Number(getRouterParam(event, 'id'))
  const body = await readBody<CreateCommentBody>(event)

  if (isNaN(recipeId)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid recipe ID',
    })
  }

  if (!body.content?.trim()) {
    throw createError({
      statusCode: 400,
      message: 'Comment content is required',
    })
  }

  // Validate ratings
  if (body.tasteRating !== undefined && (body.tasteRating < 1 || body.tasteRating > 5)) {
    throw createError({
      statusCode: 400,
      message: 'Taste rating must be between 1 and 5',
    })
  }

  if (body.difficultyRating !== undefined && (body.difficultyRating < 1 || body.difficultyRating > 5)) {
    throw createError({
      statusCode: 400,
      message: 'Difficulty rating must be between 1 and 5',
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

  if (!recipe.isPublished && recipe.userId !== user.id) {
    throw createError({
      statusCode: 404,
      message: 'Recipe not found',
    })
  }

  // Create comment
  const [newComment] = await db.insert(comments).values({
    recipeId,
    userId: user.id,
    content: body.content.trim(),
    photo: body.photo || null,
    tasteRating: body.tasteRating || null,
    difficultyRating: body.difficultyRating || null,
  }).returning()

  if (!newComment) {
    throw createError({
      statusCode: 500,
      message: 'Failed to create comment',
    })
  }

  // Fetch with user for response
  const commentWithUser = await db.query.comments.findFirst({
    where: eq(comments.id, newComment.id),
    with: {
      user: true,
    },
  })

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

  return { comment: commentWithUser }
})
