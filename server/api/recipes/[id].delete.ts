import { eq } from 'drizzle-orm'
import { db, recipes } from '../../db'
import { requireAuth } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = Number(getRouterParam(event, 'id'))

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

  // Check ownership
  if (existing.userId !== user.id) {
    throw createError({
      statusCode: 403,
      message: 'You can only delete your own recipes',
    })
  }

  await db.delete(recipes).where(eq(recipes.id, id))

  return { success: true }
})
