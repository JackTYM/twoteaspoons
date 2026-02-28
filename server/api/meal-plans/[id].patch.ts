import { eq } from 'drizzle-orm'
import { db, mealPlans } from '../../db'
import { requireAuth } from '../../utils/session'

interface UpdateMealPlanBody {
  date?: string
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  servings?: number
}

const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack']

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<UpdateMealPlanBody>(event)

  if (isNaN(id)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid meal plan ID',
    })
  }

  // Verify ownership
  const plan = await db.query.mealPlans.findFirst({
    where: eq(mealPlans.id, id),
  })

  if (!plan) {
    throw createError({
      statusCode: 404,
      message: 'Meal plan not found',
    })
  }

  if (plan.userId !== user.id) {
    throw createError({
      statusCode: 403,
      message: 'You can only update your own meal plans',
    })
  }

  if (body.mealType && !validMealTypes.includes(body.mealType)) {
    throw createError({
      statusCode: 400,
      message: 'Meal type must be breakfast, lunch, dinner, or snack',
    })
  }

  const updateData: Partial<typeof mealPlans.$inferInsert> = {}
  if (body.date) updateData.date = new Date(body.date)
  if (body.mealType) updateData.mealType = body.mealType
  if (body.servings) updateData.servings = body.servings

  const [updatedPlan] = await db.update(mealPlans)
    .set(updateData)
    .where(eq(mealPlans.id, id))
    .returning()

  if (!updatedPlan) {
    throw createError({
      statusCode: 500,
      message: 'Failed to update meal plan',
    })
  }

  // Fetch with recipe details
  const planWithRecipe = await db.query.mealPlans.findFirst({
    where: eq(mealPlans.id, updatedPlan.id),
    with: {
      recipe: {
        columns: {
          id: true,
          title: true,
          coverPhoto: true,
          prepTime: true,
          cookTime: true,
          servings: true,
        },
      },
    },
  })

  return { mealPlan: planWithRecipe }
})
