import { eq, asc } from 'drizzle-orm'
import { db, recipes, ingredients, instructions } from '../../../db'
import { requireAuth } from '../../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const originalId = Number(getRouterParam(event, 'id'))

  if (isNaN(originalId)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid recipe ID',
    })
  }

  // Get the original recipe with all details
  const original = await db.query.recipes.findFirst({
    where: eq(recipes.id, originalId),
    with: {
      ingredients: {
        orderBy: [asc(ingredients.sortOrder)],
      },
      instructions: {
        orderBy: [asc(instructions.stepNumber)],
      },
    },
  })

  if (!original) {
    throw createError({
      statusCode: 404,
      message: 'Recipe not found',
    })
  }

  // Check access: must be published OR owned by current user
  if (!original.isPublished && original.userId !== user.id) {
    throw createError({
      statusCode: 404,
      message: 'Recipe not found',
    })
  }

  // Create the forked recipe
  const [forkedRecipe] = await db.insert(recipes).values({
    userId: user.id,
    title: `${original.title} (My Version)`,
    description: original.description,
    coverPhoto: original.coverPhoto,
    prepTime: original.prepTime,
    cookTime: original.cookTime,
    servings: original.servings,
    isPublished: false, // Start as draft
    forkedFromId: original.id,
    // Keep source attribution from original if it was imported
    sourceUrl: original.sourceUrl,
    sourceAuthor: original.sourceAuthor,
    sourceSite: original.sourceSite,
  }).returning()

  if (!forkedRecipe) {
    throw createError({
      statusCode: 500,
      message: 'Failed to fork recipe',
    })
  }

  // Copy ingredients
  if (original.ingredients.length > 0) {
    await db.insert(ingredients).values(
      original.ingredients.map((ing, index) => ({
        recipeId: forkedRecipe.id,
        amount: ing.amount,
        unit: ing.unit,
        item: ing.item,
        notes: ing.notes,
        sortOrder: index,
      }))
    )
  }

  // Copy instructions
  if (original.instructions.length > 0) {
    await db.insert(instructions).values(
      original.instructions.map((inst) => ({
        recipeId: forkedRecipe.id,
        stepNumber: inst.stepNumber,
        content: inst.content,
        timerMinutes: inst.timerMinutes,
        photo: inst.photo,
      }))
    )
  }

  return { recipe: forkedRecipe }
})
