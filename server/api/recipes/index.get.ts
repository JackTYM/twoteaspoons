import { eq, desc, asc, or } from 'drizzle-orm'
import { db, recipes, ingredients, instructions } from '../../db'
import { getAuthUser } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event)
  const query = getQuery(event)

  // Filter options
  const mine = query.mine === 'true'

  let whereClause

  if (mine && user) {
    // Only user's recipes
    whereClause = eq(recipes.userId, user.id)
  } else if (user) {
    // Public recipes OR user's own recipes
    whereClause = or(
      eq(recipes.isPublished, true),
      eq(recipes.userId, user.id)
    )
  } else {
    // Only public recipes
    whereClause = eq(recipes.isPublished, true)
  }

  const recipeList = await db.query.recipes.findMany({
    where: whereClause,
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
