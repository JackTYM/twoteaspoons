import { eq, desc, asc, inArray } from 'drizzle-orm'
import { db, favorites, recipes, users, categories, recipeCategories } from '../../db'
import { requireAuth } from '../../utils/session'

interface SavedRecipeRow {
  id: number
  slug: string
  title: string
  description: string | null
  coverPhoto: string | null
  prepTime: number | null
  cookTime: number | null
  servings: number | null
  saveCount: number | null
  savedAt: Date | null
  authorId: string
  authorName: string | null
  authorUsername: string | null
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  // Get all saved recipes for the user with recipe details
  const savedRecipes: SavedRecipeRow[] = await db
    .select({
      id: recipes.id,
      slug: recipes.slug,
      title: recipes.title,
      description: recipes.description,
      coverPhoto: recipes.coverPhoto,
      prepTime: recipes.prepTime,
      cookTime: recipes.cookTime,
      servings: recipes.servings,
      saveCount: recipes.saveCount,
      savedAt: favorites.createdAt,
      authorId: recipes.userId,
      authorName: users.name,
      authorUsername: users.username,
    })
    .from(favorites)
    .innerJoin(recipes, eq(favorites.recipeId, recipes.id))
    .leftJoin(users, eq(recipes.userId, users.id))
    .where(eq(favorites.userId, user.id))
    .orderBy(desc(favorites.createdAt))

  // Fetch categories for all recipes in one query
  const allRecipeIds = savedRecipes.map(r => r.id)
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

  return {
    recipes: savedRecipes.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      description: r.description,
      coverPhoto: r.coverPhoto,
      prepTime: r.prepTime,
      cookTime: r.cookTime,
      servings: r.servings,
      saveCount: r.saveCount,
      savedAt: r.savedAt?.toISOString(),
      author: r.authorName
        ? {
            name: r.authorName,
            username: r.authorUsername,
          }
        : null,
      categories: recipeCategoriesMap.get(r.id) || [],
    })),
  }
})
