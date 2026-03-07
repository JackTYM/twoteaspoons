import { eq, desc, asc, or, and, inArray } from 'drizzle-orm'
import { db, recipes, ingredients, instructions, favorites, categories, recipeCategories } from '../../db'
import { getAuthUser } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event)
  const query = getQuery(event)

  // Filter options
  const mine = query.mine === 'true'
  const categoryFilter = query.categories as string | undefined

  // Parse category slugs from query
  const categorySlugs = categoryFilter
    ? categoryFilter.split(',').map(s => s.trim()).filter(Boolean)
    : []

  // Build base where clause for access control
  let accessClause
  if (mine && user) {
    // Only user's recipes
    accessClause = eq(recipes.userId, user.id)
  } else if (user) {
    // Public recipes OR user's own recipes
    accessClause = or(
      eq(recipes.isPublished, true),
      eq(recipes.userId, user.id)
    )
  } else {
    // Only public recipes
    accessClause = eq(recipes.isPublished, true)
  }

  // If filtering by categories, get matching recipe IDs first
  let categoryRecipeIds: number[] | null = null
  if (categorySlugs.length > 0) {
    // Get category IDs from slugs
    const matchingCategories = await db
      .select({ id: categories.id })
      .from(categories)
      .where(inArray(categories.slug, categorySlugs))

    const categoryIds = matchingCategories.map(c => c.id)

    if (categoryIds.length > 0) {
      // Get recipe IDs that have ANY of these categories
      const matchingRecipes = await db
        .selectDistinct({ recipeId: recipeCategories.recipeId })
        .from(recipeCategories)
        .where(inArray(recipeCategories.categoryId, categoryIds))

      categoryRecipeIds = matchingRecipes.map(r => r.recipeId)
    } else {
      // No matching categories found, return empty
      categoryRecipeIds = []
    }
  }

  // Combine access clause with category filter
  let whereClause = accessClause
  if (categoryRecipeIds !== null) {
    if (categoryRecipeIds.length === 0) {
      // No recipes match the category filter
      return { recipes: [] }
    }
    whereClause = and(accessClause, inArray(recipes.id, categoryRecipeIds))
  }

  const recipeList = await db.query.recipes.findMany({
    where: whereClause,
    orderBy: [desc(recipes.createdAt), desc(recipes.id)], // Match client's default 'newest' sort
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

  // Deduplicate recipes by ID (defensive fix for OR clause edge cases)
  const seenIds = new Set<number>()
  const uniqueRecipeList = recipeList.filter((recipe) => {
    if (seenIds.has(recipe.id)) {
      return false
    }
    seenIds.add(recipe.id)
    return true
  })

  // Get saved recipe IDs for the current user
  let savedRecipeIds: Set<number> = new Set()
  if (user && uniqueRecipeList.length > 0) {
    const savedRecipes = await db
      .select({ recipeId: favorites.recipeId })
      .from(favorites)
      .where(eq(favorites.userId, user.id))

    savedRecipeIds = new Set(savedRecipes.map((s) => s.recipeId))
  }

  // Fetch categories for all recipes in one query
  const allRecipeIds = uniqueRecipeList.map(r => r.id)
  const recipeCategoriesMap = new Map<number, Array<{
    id: number
    name: string
    slug: string
    icon: string | null
    type: string
  }>>()

  if (allRecipeIds.length > 0) {
    const allCategories = await db
      .select({
        recipeId: recipeCategories.recipeId,
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        icon: categories.icon,
        type: categories.type,
      })
      .from(recipeCategories)
      .innerJoin(categories, eq(recipeCategories.categoryId, categories.id))
      .where(inArray(recipeCategories.recipeId, allRecipeIds))
      .orderBy(asc(categories.type), asc(categories.sortOrder))

    for (const cat of allCategories) {
      if (!recipeCategoriesMap.has(cat.recipeId)) {
        recipeCategoriesMap.set(cat.recipeId, [])
      }
      recipeCategoriesMap.get(cat.recipeId)!.push({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        type: cat.type,
      })
    }
  }

  // Add isSaved flag and categories to each recipe
  const recipesWithSaved = uniqueRecipeList.map((recipe) => ({
    ...recipe,
    isSaved: savedRecipeIds.has(recipe.id),
    categories: recipeCategoriesMap.get(recipe.id) || [],
  }))

  return { recipes: recipesWithSaved }
})
