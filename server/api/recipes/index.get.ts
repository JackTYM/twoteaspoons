import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import { categories, db, favorites, ingredients, instructions, recipeCategories, recipes } from '../../db'
import type { Category, Ingredient, Instruction, Recipe, User } from '../../db/schema'
import type { DbCategory, DbIngredient, DbInstruction, DbRecipe, DbUser } from '~/types/database'
import { getAuthUser } from '../../utils/session'
import {
  serializeAuthor,
  serializeCategory,
  serializeIngredient,
  serializeInstruction,
  serializeRecipe,
} from '../../utils/serialize'

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
  ingredients: Ingredient[]
  instructions: Instruction[]
  categories: RecipeCategoryWithCategory[]
}

function mapRecipeWithDetails(recipe: RecipeRowWithDetails, savedRecipeIds: Set<number>): RecipeWithDetails {
  return {
    ...serializeRecipe(recipe),
    author: recipe.author ? serializeAuthor(recipe.author) : null,
    ingredients: recipe.ingredients.map(serializeIngredient),
    instructions: recipe.instructions.map(serializeInstruction),
    categories: recipe.categories.map((recipeCategory) => serializeCategory(recipeCategory.category)),
    is_saved: savedRecipeIds.has(recipe.id),
  }
}

export default defineEventHandler(async (event): Promise<RecipeWithDetails[]> => {
  const query = getQuery(event)
  const categorySlugs = typeof query.categories === 'string'
    ? query.categories.split(',').map((slug) => slug.trim()).filter(Boolean)
    : []

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

  const recipeRows = await db.query.recipes.findMany({
    where: filteredRecipeIds
      ? and(eq(recipes.isPublished, true), inArray(recipes.id, filteredRecipeIds))
      : eq(recipes.isPublished, true),
    orderBy: desc(recipes.createdAt),
    with: {
      author: true,
      ingredients: { orderBy: asc(ingredients.sortOrder) },
      instructions: { orderBy: asc(instructions.stepNumber) },
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
