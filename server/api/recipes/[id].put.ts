import { eq } from 'drizzle-orm'
import { db, recipes, ingredients, instructions } from '../../db'

interface UpdateRecipeBody {
  title?: string
  description?: string
  coverPhoto?: string
  prepTime?: number
  cookTime?: number
  servings?: number
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
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<UpdateRecipeBody>(event)

  if (isNaN(id)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid recipe ID',
    })
  }

  // Check recipe exists
  const existing = await db.query.recipes.findFirst({
    where: eq(recipes.id, id),
  })

  if (!existing) {
    throw createError({
      statusCode: 404,
      message: 'Recipe not found',
    })
  }

  // TODO: Check ownership once auth is integrated

  // Update recipe
  const [updated] = await db.update(recipes)
    .set({
      title: body.title ?? existing.title,
      description: body.description,
      coverPhoto: body.coverPhoto,
      prepTime: body.prepTime,
      cookTime: body.cookTime,
      servings: body.servings,
      sourceUrl: body.sourceUrl,
      sourceAuthor: body.sourceAuthor,
      sourceSite: body.sourceSite,
      updatedAt: new Date(),
    })
    .where(eq(recipes.id, id))
    .returning()

  // Replace ingredients if provided
  if (body.ingredients) {
    await db.delete(ingredients).where(eq(ingredients.recipeId, id))
    if (body.ingredients.length) {
      await db.insert(ingredients).values(
        body.ingredients.map((ing, index) => ({
          recipeId: id,
          amount: ing.amount ? String(ing.amount) : null,
          unit: ing.unit || null,
          item: ing.item,
          notes: ing.notes || null,
          sortOrder: index,
        }))
      )
    }
  }

  // Replace instructions if provided
  if (body.instructions) {
    await db.delete(instructions).where(eq(instructions.recipeId, id))
    if (body.instructions.length) {
      await db.insert(instructions).values(
        body.instructions.map((inst, index) => ({
          recipeId: id,
          stepNumber: index + 1,
          content: inst.content,
          timerMinutes: inst.timerMinutes,
        }))
      )
    }
  }

  return { recipe: updated }
})
