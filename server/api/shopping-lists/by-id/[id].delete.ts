import { eq, and } from 'drizzle-orm'
import { db, shoppingLists } from '../../../db'
import { requireAuth } from '../../../utils/session'

/**
 * Delete shopping list by ID (numeric) or slug (string).
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const param = getRouterParam(event, 'id')

  if (!param) {
    throw createError({
      statusCode: 400,
      message: 'List ID or slug is required',
    })
  }

  const isNumericId = /^\d+$/.test(param)

  let existing
  if (isNumericId) {
    existing = await db.query.shoppingLists.findFirst({
      where: eq(shoppingLists.id, Number(param)),
    })
  } else {
    existing = await db.query.shoppingLists.findFirst({
      where: and(eq(shoppingLists.userId, user.id), eq(shoppingLists.slug, param)),
    })
  }

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

  await db.delete(shoppingLists).where(eq(shoppingLists.id, existing.id))

  return { success: true }
})
