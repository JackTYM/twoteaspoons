import { eq, desc, asc } from 'drizzle-orm'
import { db, recipes, ingredients, instructions } from '../../db'

export default defineEventHandler(async (event) => {
  // TODO: Get userId from session once auth middleware is set up
  // For now, accept userId as query param for testing
  const query = getQuery(event)
  const userId = query.userId ? Number(query.userId) : undefined

  const recipeList = await db.query.recipes.findMany({
    where: userId ? eq(recipes.userId, userId) : undefined,
    orderBy: [desc(recipes.updatedAt)],
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

  return { recipes: recipeList }
})
