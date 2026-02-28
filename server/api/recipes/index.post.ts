import { db, recipes, ingredients, instructions } from '../../db'
import { requireAuth } from '../../utils/session'

interface CreateRecipeBody {
  title: string
  description?: string
  coverPhoto?: string
  prepTime?: number
  cookTime?: number
  servings?: number
  isPublished?: boolean
  sourceUrl?: string
  sourceAuthor?: string
  sourceSite?: string
  ingredients?: Array<{
    amount?: number | string
    unit?: string
    item: string
    notes?: string
  }>
  instructions?: Array<{
    content: string
    timerMinutes?: number
  }>
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody<CreateRecipeBody>(event)

  if (!body.title) {
    throw createError({
      statusCode: 400,
      message: 'Title is required',
    })
  }

  // Insert recipe
  const [newRecipe] = await db.insert(recipes).values({
    userId: user.id,
    title: body.title,
    description: body.description,
    coverPhoto: body.coverPhoto,
    prepTime: body.prepTime,
    cookTime: body.cookTime,
    servings: body.servings || 4,
    isPublished: body.isPublished ?? true,
    sourceUrl: body.sourceUrl,
    sourceAuthor: body.sourceAuthor,
    sourceSite: body.sourceSite,
  }).returning()

  if (!newRecipe) {
    throw createError({
      statusCode: 500,
      message: 'Failed to create recipe',
    })
  }

  // Insert ingredients
  if (body.ingredients?.length) {
    await db.insert(ingredients).values(
      body.ingredients.map((ing, index) => ({
        recipeId: newRecipe.id,
        amount: ing.amount ? String(ing.amount) : null,
        unit: ing.unit || null,
        item: ing.item,
        notes: ing.notes || null,
        sortOrder: index,
      }))
    )
  }

  // Insert instructions
  if (body.instructions?.length) {
    await db.insert(instructions).values(
      body.instructions.map((inst, index) => ({
        recipeId: newRecipe.id,
        stepNumber: index + 1,
        content: inst.content,
        timerMinutes: inst.timerMinutes,
      }))
    )
  }

  return { recipe: newRecipe }
})
