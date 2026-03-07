import { eq, and, asc } from 'drizzle-orm'
import {
  db,
  recipes,
  users,
  ingredients,
  instructions,
  recipeSlugHistory,
  categories,
  recipeCategories,
} from '../db'
import type { Recipe, User, Ingredient, Instruction } from '../db/schema'

// Transform instruction to parse ingredientIds from JSON string
interface ParsedInstruction extends Omit<Instruction, 'ingredientIds'> {
  ingredientIds: number[] | null
}

function parseInstruction(instruction: Instruction): ParsedInstruction {
  let parsedIngredientIds: number[] | null = null
  if (instruction.ingredientIds) {
    try {
      parsedIngredientIds = JSON.parse(instruction.ingredientIds) as number[]
    } catch {
      parsedIngredientIds = null
    }
  }
  return {
    ...instruction,
    ingredientIds: parsedIngredientIds,
  }
}

export interface RecipeCategory {
  id: number
  name: string
  slug: string
  icon: string | null
  type: string
}

export interface RecipeWithAuthor extends Recipe {
  author: User
  ingredients: Ingredient[]
  instructions: ParsedInstruction[]
  categories?: RecipeCategory[]
}

export interface ResolveResult {
  recipe: RecipeWithAuthor
  /** If true, the slug was found in history and should redirect to current slug */
  isRedirect: boolean
}

/**
 * Resolves a recipe by username and slug.
 * Also checks slug history for old URLs that should redirect.
 *
 * @param username - The author's username
 * @param slug - The recipe's slug (current or historical)
 * @returns The recipe with relations and redirect flag, or null if not found
 */
export async function resolveRecipeBySlug(
  username: string,
  slug: string
): Promise<ResolveResult | null> {
  // First, find the user by username
  const user = await db.query.users.findFirst({
    where: eq(users.username, username),
  })

  if (!user) {
    return null
  }

  // Try to find by current slug first
  const recipe = await db.query.recipes.findFirst({
    where: and(eq(recipes.userId, user.id), eq(recipes.slug, slug)),
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

  if (recipe) {
    // Fetch categories for this recipe
    const recipeCategs = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        icon: categories.icon,
        type: categories.type,
      })
      .from(recipeCategories)
      .innerJoin(categories, eq(recipeCategories.categoryId, categories.id))
      .where(eq(recipeCategories.recipeId, recipe.id))
      .orderBy(asc(categories.type), asc(categories.sortOrder))

    return {
      recipe: {
        ...recipe,
        instructions: recipe.instructions.map(parseInstruction),
        categories: recipeCategs,
      } as RecipeWithAuthor,
      isRedirect: false,
    }
  }

  // If not found, check slug history for old URLs
  const historyEntry = await db.query.recipeSlugHistory.findFirst({
    where: eq(recipeSlugHistory.slug, slug),
    with: {
      recipe: {
        with: {
          author: true,
          ingredients: {
            orderBy: [asc(ingredients.sortOrder)],
          },
          instructions: {
            orderBy: [asc(instructions.stepNumber)],
          },
        },
      },
    },
  })

  // Verify the history entry belongs to the right user
  if (historyEntry?.recipe && historyEntry.recipe.userId === user.id) {
    // Fetch categories for this recipe
    const recipeCategs = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        icon: categories.icon,
        type: categories.type,
      })
      .from(recipeCategories)
      .innerJoin(categories, eq(recipeCategories.categoryId, categories.id))
      .where(eq(recipeCategories.recipeId, historyEntry.recipe.id))
      .orderBy(asc(categories.type), asc(categories.sortOrder))

    return {
      recipe: {
        ...historyEntry.recipe,
        instructions: historyEntry.recipe.instructions.map(parseInstruction),
        categories: recipeCategs,
      } as RecipeWithAuthor,
      isRedirect: true,
    }
  }

  return null
}

/**
 * Resolves a recipe by its numeric ID.
 * Used for legacy URL support and redirects.
 *
 * @param id - The recipe's numeric ID
 * @returns The recipe with author (for building redirect URL), or null if not found
 */
export async function resolveRecipeById(
  id: number
): Promise<RecipeWithAuthor | null> {
  const recipe = await db.query.recipes.findFirst({
    where: eq(recipes.id, id),
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

  if (!recipe) {
    return null
  }

  // Fetch categories for this recipe
  const recipeCategs = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      icon: categories.icon,
      type: categories.type,
    })
    .from(recipeCategories)
    .innerJoin(categories, eq(recipeCategories.categoryId, categories.id))
    .where(eq(recipeCategories.recipeId, recipe.id))
    .orderBy(asc(categories.type), asc(categories.sortOrder))

  return {
    ...recipe,
    instructions: recipe.instructions.map(parseInstruction),
    categories: recipeCategs,
  } as RecipeWithAuthor
}

/**
 * Gets the canonical URL path for a recipe.
 * Returns the username/slug path for proper URLs.
 *
 * @param recipe - Recipe with author information
 * @returns The canonical path (e.g., "/recipes/jack/chocolate-chip-cookies")
 */
export function getRecipeCanonicalPath(recipe: {
  slug: string
  author: { username: string | null }
}): string {
  const username = recipe.author?.username
  if (!username) {
    // Fallback - this shouldn't happen after migration
    throw new Error('Recipe author has no username')
  }
  return `/recipes/${username}/${recipe.slug}`
}
