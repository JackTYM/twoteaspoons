import {
  resolveRecipeBySlug,
  getRecipeCanonicalPath,
} from '../../../../utils/recipeResolver'
import { getAuthUser } from '../../../../utils/session'

export default defineEventHandler(async (event) => {
  const username = getRouterParam(event, 'username')
  const slug = getRouterParam(event, 'slug')
  const user = await getAuthUser(event)

  if (!username || !slug) {
    throw createError({
      statusCode: 400,
      message: 'Username and slug are required',
    })
  }

  const result = await resolveRecipeBySlug(username, slug)

  if (!result) {
    throw createError({
      statusCode: 404,
      message: 'Recipe not found',
    })
  }

  const { recipe, isRedirect } = result

  // If this is an old slug, redirect to the current canonical URL
  if (isRedirect) {
    const canonicalPath = getRecipeCanonicalPath(recipe)
    return sendRedirect(event, `/api${canonicalPath}`, 301)
  }

  // Check access: must be published OR owned by current user
  const isOwner = user?.id === recipe.userId
  if (!recipe.isPublished && !isOwner) {
    throw createError({
      statusCode: 404,
      message: 'Recipe not found',
    })
  }

  return { recipe, isOwner }
})
