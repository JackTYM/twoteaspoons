import { and, asc, eq } from 'drizzle-orm'
import type { DbCategory, DbIngredient, DbInstruction, DbRecipe, DbUser } from '~/types/database'
import { db, favorites, ingredients, instructions, recipes, users } from '../../db'
import type { Category, Ingredient, Instruction, Recipe, User } from '../../db/schema'
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

function mapRecipeWithDetails(recipe: RecipeRowWithDetails, isSaved: boolean): RecipeWithDetails {
  return {
    ...serializeRecipe(recipe),
    author: recipe.author ? serializeAuthor(recipe.author) : null,
    ingredients: recipe.ingredients.map(serializeIngredient),
    instructions: recipe.instructions.map(serializeInstruction),
    categories: recipe.categories.map((recipeCategory) => serializeCategory(recipeCategory.category)),
    is_saved: isSaved,
  }
}

export default defineEventHandler(async (event): Promise<RecipeWithDetails | null> => {
  const query = getQuery(event)
  const username = typeof query.username === 'string' ? query.username : ''
  const slug = typeof query.slug === 'string' ? query.slug : ''

  if (!username || !slug) {
    throw createError({
      statusCode: 400,
      message: 'username and slug are required',
    })
  }

  const user = await db.query.users.findFirst({
    columns: { id: true },
    where: eq(users.username, username),
  })

  if (!user) {
    return null
  }

  const recipe = await db.query.recipes.findFirst({
    where: and(eq(recipes.userId, user.id), eq(recipes.slug, slug)),
    with: {
      author: true,
      ingredients: { orderBy: asc(ingredients.sortOrder) },
      instructions: { orderBy: asc(instructions.stepNumber) },
      categories: { with: { category: true } },
    },
  })

  if (!recipe) {
    return null
  }

  const authUser = await getAuthUser(event)
  let isSaved = false

  if (authUser) {
    const favorite = await db.query.favorites.findFirst({
      columns: { recipeId: true },
      where: and(eq(favorites.userId, authUser.id), eq(favorites.recipeId, recipe.id)),
    })

    isSaved = Boolean(favorite)
  }

  return mapRecipeWithDetails(recipe, isSaved)
})
