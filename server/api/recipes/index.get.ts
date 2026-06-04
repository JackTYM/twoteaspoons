import { and, desc, eq, inArray, lt } from 'drizzle-orm'
import { categories, db, favorites, recipeCategories, recipes } from '../../db'
import type { Category, Recipe, User } from '../../db/schema'
import type { DbCategory, DbIngredient, DbInstruction, DbRecipe, DbUser } from '~/types/database'
import { getAuthUser } from '../../utils/session'
import {
  serializeAuthor,
  serializeCategory,
  serializeRecipe,
} from '../../utils/serialize'

const PAGE_SIZE = 24

interface RecipeWithDetails extends DbRecipe {
  author: Pick<DbUser, 'id' | 'name' | 'username' | 'avatar'> | null
  ingredients: DbIngredient[]
  instructions: DbInstruction[]
  categories: DbCategory[]
  is_saved?: boolean
}

interface RecipeCategoryWithCategory {
  category: Category
}

interface RecipeRowWithDetails extends Recipe {
  author: User | null
  categories: RecipeCategoryWithCategory[]
}

function mapRecipeWithDetails(recipe: RecipeRowWithDetails, savedRecipeIds: Set<number>): RecipeWithDetails {
  return {
    ...serializeRecipe(recipe),
    author: recipe.author ? serializeAuthor(recipe.author) : null,
    ingredients: [],
    instructions: [],
    categories: recipe.categories.map((recipeCategory) => serializeCategory(recipeCategory.category)),
    is_saved: savedRecipeIds.has(recipe.id),
  }
}

export default defineEventHandler(async (event): Promise<RecipeWithDetails[]> => {
  const query = getQuery(event)
  const categorySlugs = typeof query.categories === 'string'
    ? query.categories.split(',').map((slug) => slug.trim()).filter(Boolean)
    : []

  // Keyset pagination: cursor is the last recipe ID from the previous page
  const cursor = typeof query.cursor === 'string' ? parseInt(query.cursor, 10) : null

  let filteredRecipeIds: number[] | null = null
  if (categorySlugs.length > 0) {
    const matchingCategories = await db.query.categories.findMany({
      columns: { id: true },
      where: inArray(categories.slug, categorySlugs),
    })

    if (matchingCategories.length === 0) {
      return []
    }

    const matchingRecipeCategories = await db.query.recipeCategories.findMany({
      columns: { recipeId: true },
      where: inArray(recipeCategories.categoryId, matchingCategories.map((category) => category.id)),
    })

    filteredRecipeIds = [...new Set(matchingRecipeCategories.map((recipeCategory) => recipeCategory.recipeId))]
    if (filteredRecipeIds.length === 0) {
      return []
    }
  }

  const baseWhere = filteredRecipeIds
    ? and(eq(recipes.isPublished, true), inArray(recipes.id, filteredRecipeIds))
    : eq(recipes.isPublished, true)

  const recipeRows = await db.query.recipes.findMany({
    where: cursor ? and(baseWhere, lt(recipes.id, cursor)) : baseWhere,
    orderBy: desc(recipes.id),
    limit: PAGE_SIZE,
    with: {
      author: true,
      categories: { with: { category: true } },
    },
  })

  const recipeIds = recipeRows.map((recipe) => recipe.id)
  const authUser = await getAuthUser(event)
  const savedRecipeIds = new Set<number>()

  if (authUser && recipeIds.length > 0) {
    const favoriteRows = await db.query.favorites.findMany({
      columns: { recipeId: true },
      where: and(eq(favorites.userId, authUser.id), inArray(favorites.recipeId, recipeIds)),
    })

    for (const favorite of favoriteRows) {
      savedRecipeIds.add(favorite.recipeId)
    }
  }

  return recipeRows.map((recipe) => mapRecipeWithDetails(recipe, savedRecipeIds))
})
