import { eq, desc } from 'drizzle-orm'
import { db, recipes } from '../../../db'
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

  // Get the original recipe
  const original = await db.query.recipes.findFirst({
    where: eq(recipes.id, recipeId),
    with: {
      author: true,
    },
  })

  if (!original) {
    throw createError({
      statusCode: 404,
      message: 'Recipe not found',
    })
  }

  // Check access
  if (!original.isPublished && original.userId !== user?.id) {
    throw createError({
      statusCode: 404,
      message: 'Recipe not found',
    })
  }

  // Get all forks of this recipe (only public ones, or user's own)
  const forks = await db.query.recipes.findMany({
    where: eq(recipes.forkedFromId, recipeId),
    orderBy: [desc(recipes.createdAt)],
    with: {
      author: true,
    },
  })

  // Filter to only show public forks or user's own forks
  const visibleForks = forks.filter(fork =>
    fork.isPublished || fork.userId === user?.id
  )

  // Get the parent recipe if this is a fork
  let parent = null
  if (original.forkedFromId) {
    parent = await db.query.recipes.findFirst({
      where: eq(recipes.id, original.forkedFromId),
      with: {
        author: true,
      },
    })
    // Only include if accessible
    if (parent && !parent.isPublished && parent.userId !== user?.id) {
      parent = null
    }
  }

  return {
    parent,
    forks: visibleForks,
    forkCount: visibleForks.length,
  }
})
