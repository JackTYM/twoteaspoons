import { and, eq, gte, lte } from 'drizzle-orm'
import { db, mealPlans } from '../../db'
import { requireAuth } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)

  // Get date range from query params (default to current week)
  const startDate = query.start
    ? new Date(query.start as string)
    : getStartOfWeek(new Date())
  const endDate = query.end
    ? new Date(query.end as string)
    : getEndOfWeek(new Date())

  const plans = await db.query.mealPlans.findMany({
    where: and(
      eq(mealPlans.userId, user.id),
      gte(mealPlans.date, startDate),
      lte(mealPlans.date, endDate)
    ),
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
    orderBy: [mealPlans.date],
  })

  return { mealPlans: plans }
})

function getStartOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function getEndOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() + (6 - day)
  d.setDate(diff)
  d.setHours(23, 59, 59, 999)
  return d
}
