import { eq, asc } from 'drizzle-orm'
import { db, recipes, ingredients, instructions } from '../../db'
import { getAuthUser } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const user = await getAuthUser(event)

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

  // Check access: must be published OR owned by current user
  const isOwner = user?.id === recipe.userId
  if (!recipe.isPublished && !isOwner) {
    throw createError({
      statusCode: 404,
      message: 'Recipe not found',
    })
  }

  return { recipe, isOwner }
})
