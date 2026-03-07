import { eq, desc } from 'drizzle-orm'
import { db, recipes } from '../../../../db'
import { getAuthUser } from '../../../../utils/session'
import { resolveRecipeBySlug } from '../../../../utils/recipeResolver'

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

  // Get the original recipe
  const result = await resolveRecipeBySlug(username, slug)

  if (!result) {
    throw createError({
      statusCode: 404,
      message: 'Recipe not found',
    })
  }

  const original = result.recipe

  // Check access
  if (!original.isPublished && original.userId !== user?.id) {
    throw createError({
      statusCode: 404,
      message: 'Recipe not found',
    })
  }

  // Get all forks of this recipe (only public ones, or user's own)
  const forks = await db.query.recipes.findMany({
    where: eq(recipes.forkedFromId, original.id),
    orderBy: [desc(recipes.createdAt)],
    with: {
      author: true,
    },
  })

  // Filter to only show public forks or user's own forks
  const visibleForks = forks.filter(
    (fork) => fork.isPublished || fork.userId === user?.id
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
