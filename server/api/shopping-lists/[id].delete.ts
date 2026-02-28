import { eq } from 'drizzle-orm'
import { db, shoppingLists } from '../../db'
import { requireAuth } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = Number(getRouterParam(event, 'id'))

  if (isNaN(id)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid list ID',
    })
  }

  const existing = await db.query.shoppingLists.findFirst({
    where: eq(shoppingLists.id, id),
  })

  if (!existing) {
    throw createError({
      statusCode: 404,
      message: 'Shopping list not found',
    })
  }

  // Check ownership
  if (existing.userId !== user.id) {
    throw createError({
      statusCode: 403,
      message: 'You can only delete your own shopping lists',
    })
  }

  await db.delete(shoppingLists).where(eq(shoppingLists.id, id))

  return { success: true }
})
