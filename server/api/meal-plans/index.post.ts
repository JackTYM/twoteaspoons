import { eq } from 'drizzle-orm'
import { db, mealPlans, recipes } from '../../db'
import { requireAuth } from '../../utils/session'

interface CreateMealPlanBody {
  recipeId: number
  date: string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  servings?: number
}

const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack']

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody<CreateMealPlanBody>(event)

  if (!body.recipeId || !body.date || !body.mealType) {
    throw createError({
      statusCode: 400,
      message: 'Recipe ID, date, and meal type are required',
    })
  }

  if (!validMealTypes.includes(body.mealType)) {
    throw createError({
      statusCode: 400,
      message: 'Meal type must be breakfast, lunch, dinner, or snack',
    })
  }

  // Verify recipe exists and is accessible
  const recipe = await db.query.recipes.findFirst({
    where: eq(recipes.id, body.recipeId),
  })

  if (!recipe) {
    throw createError({
      statusCode: 404,
      message: 'Recipe not found',
    })
  }

  if (!recipe.isPublished && recipe.userId !== user.id) {
    throw createError({
      statusCode: 404,
      message: 'Recipe not found',
    })
  }

  const [newPlan] = await db.insert(mealPlans).values({
    userId: user.id,
    recipeId: body.recipeId,
    date: new Date(body.date),
    mealType: body.mealType,
    servings: body.servings || recipe.servings || 4,
  }).returning()

  if (!newPlan) {
    throw createError({
      statusCode: 500,
      message: 'Failed to create meal plan',
    })
  }

  // Fetch with recipe details (matching the GET endpoint shape)
  const planWithRecipe = await db.query.mealPlans.findFirst({
    where: eq(mealPlans.id, newPlan.id),
    with: {
      recipe: {
        columns: {
          id: true,
          title: true,
          slug: true,
          coverPhoto: true,
          prepTime: true,
          cookTime: true,
          servings: true,
        },
        with: {
          author: {
            columns: {
              username: true,
            },
          },
        },
      },
    },
  })

  return { mealPlan: planWithRecipe }
})
