import { eq } from 'drizzle-orm'
import { db, recipes, favorites, collections, collectionRecipes } from '../../db'
import { requireAuth } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  // Get all user's recipes with full details
  const userRecipes = await db.query.recipes.findMany({
    where: eq(recipes.userId, user.id),
    with: {
      ingredients: {
        orderBy: (ingredients, { asc }) => [asc(ingredients.sortOrder)],
      },
      instructions: {
        orderBy: (instructions, { asc }) => [asc(instructions.stepNumber)],
      },
    },
  })

  // Get user's favorites
  const userFavorites = await db.query.favorites.findMany({
    where: eq(favorites.userId, user.id),
    with: {
      recipe: {
        with: {
          ingredients: {
            orderBy: (ingredients, { asc }) => [asc(ingredients.sortOrder)],
          },
          instructions: {
            orderBy: (instructions, { asc }) => [asc(instructions.stepNumber)],
          },
        },
      },
    },
  })

  // Get user's collections
  const userCollections = await db.query.collections.findMany({
    where: eq(collections.userId, user.id),
  })

  // Get collection recipes
  const collectionRecipeData: Record<number, number[]> = {}
  for (const collection of userCollections) {
    const recipes = await db.query.collectionRecipes.findMany({
      where: eq(collectionRecipes.collectionId, collection.id),
    })
    collectionRecipeData[collection.id] = recipes.map(r => r.recipeId)
  }

  // Format export data
  const exportData = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    recipes: userRecipes.map(formatRecipe),
    favorites: userFavorites.map(f => formatRecipe(f.recipe)),
    collections: userCollections.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      isPublic: c.isPublic,
      recipeIds: collectionRecipeData[c.id] || [],
      createdAt: c.createdAt,
    })),
  }

  // Set headers for JSON download
  setHeader(event, 'Content-Type', 'application/json')
  setHeader(event, 'Content-Disposition', `attachment; filename="twoteaspoons-export-${new Date().toISOString().split('T')[0]}.json"`)

  return exportData
})

interface RecipeWithRelations {
  id: number
  title: string
  description: string | null
  coverPhoto: string | null
  prepTime: number | null
  cookTime: number | null
  servings: number | null
  sourceUrl: string | null
  sourceAuthor: string | null
  sourceSite: string | null
  forkedFromId: number | null
  createdAt: Date
  updatedAt: Date
  ingredients: Array<{
    id: number
    amount: string | null
    unit: string | null
    item: string
    notes: string | null
    sortOrder: number | null
  }>
  instructions: Array<{
    id: number
    stepNumber: number
    content: string
    timerMinutes: number | null
    photo: string | null
  }>
}

function formatRecipe(recipe: RecipeWithRelations): object {
  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    coverPhoto: recipe.coverPhoto,
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    servings: recipe.servings,
    source: {
      url: recipe.sourceUrl,
      author: recipe.sourceAuthor,
      site: recipe.sourceSite,
    },
    forkedFromId: recipe.forkedFromId,
    ingredients: recipe.ingredients.map(i => ({
      amount: i.amount,
      unit: i.unit,
      item: i.item,
      notes: i.notes,
    })),
    instructions: recipe.instructions.map(i => ({
      step: i.stepNumber,
      content: i.content,
      timerMinutes: i.timerMinutes,
    })),
    createdAt: recipe.createdAt,
    updatedAt: recipe.updatedAt,
  }
}
