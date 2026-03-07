import {
  resolveRecipeById,
  getRecipeCanonicalPath,
} from '../../../utils/recipeResolver'

/**
 * Legacy route handler for numeric recipe IDs.
 * Redirects to the new username/slug URL pattern.
 *
 * Example: /api/recipes/by-id/123 -> /api/recipes/jack/chocolate-chip-cookies
 */
export default defineEventHandler(async (event) => {
  const idParam = getRouterParam(event, 'id')

  const id = Number(idParam)
  if (isNaN(id)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid recipe ID',
    })
  }

  const recipe = await resolveRecipeById(id)

  if (!recipe) {
    throw createError({
      statusCode: 404,
      message: 'Recipe not found',
    })
  }

  // Check if author has username (required for redirect)
  if (!recipe.author?.username) {
    throw createError({
      statusCode: 500,
      message: 'Recipe author has no username configured',
    })
  }

  // Redirect to new canonical URL
  const canonicalPath = getRecipeCanonicalPath(recipe)
  return sendRedirect(event, `/api${canonicalPath}`, 301)
})
