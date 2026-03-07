import { eq, desc, asc } from 'drizzle-orm'
import { db, recipes, ingredients, instructions, favorites } from '../../db'
import { requireAuth } from '../../utils/session'

/**
 * GET /api/recipes/mine
 * Returns recipes owned by the current authenticated user.
 */
export default defineEventHandler(async (event) => {
  const authUser = await requireAuth(event)

  const userRecipes = await db.query.recipes.findMany({
    where: eq(recipes.userId, authUser.id),
    orderBy: [desc(recipes.updatedAt)],
    with: {
      author: true,
      ingredients: {
        orderBy: [asc(ingredients.sortOrder)],
      },
      instructions: {
        orderBy: [asc(instructions.stepNumber)],
      },
    },
  })

  // Get saved recipe IDs for the current user
  let savedRecipeIds: Set<number> = new Set()
  if (userRecipes.length > 0) {
    const savedRecipes = await db
      .select({ recipeId: favorites.recipeId })
      .from(favorites)
      .where(eq(favorites.userId, authUser.id))

    savedRecipeIds = new Set(savedRecipes.map((s) => s.recipeId))
  }

  // Transform to response format
  const transformedRecipes = userRecipes.map((recipe) => ({
    id: recipe.id,
    title: recipe.title,
    slug: recipe.slug,
    description: recipe.description,
    coverPhoto: recipe.coverPhoto,
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    servings: recipe.servings,
    isPublished: recipe.isPublished,
    saveCount: recipe.saveCount,
    isSaved: savedRecipeIds.has(recipe.id),
    createdAt: recipe.createdAt.toISOString(),
    author: recipe.author
      ? {
          id: recipe.author.id,
          username: recipe.author.username,
          name: recipe.author.name,
        }
      : null,
  }))

  return { recipes: transformedRecipes }
})
