import { eq } from 'drizzle-orm'
import { db, mealPlans } from '../../db'
import { requireAuth } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = Number(getRouterParam(event, 'id'))

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
      message: 'You can only delete your own meal plans',
    })
  }

  await db.delete(mealPlans).where(eq(mealPlans.id, id))

  return { success: true }
})
