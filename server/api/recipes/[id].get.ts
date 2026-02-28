import { eq, asc } from 'drizzle-orm'
import { db, recipes, ingredients, instructions } from '../../db'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))

  if (isNaN(id)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid recipe ID',
    })
  }

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
    throw createError({
      statusCode: 404,
      message: 'Recipe not found',
    })
  }

  return { recipe }
})
