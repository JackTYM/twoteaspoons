import { eq, and } from 'drizzle-orm'
import { db, collections } from '../../../../db'
import { requireAuth } from '../../../../utils/session'

/**
 * Delete collection by ID (numeric) or slug (string).
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const param = getRouterParam(event, 'id')

  if (!param) {
    throw createError({
      statusCode: 400,
      message: 'Collection ID or slug is required',
    })
  }

  const isNumericId = /^\d+$/.test(param)

  let existing
  if (isNumericId) {
    existing = await db.query.collections.findFirst({
      where: eq(collections.id, Number(param)),
    })
  } else {
    existing = await db.query.collections.findFirst({
      where: and(eq(collections.userId, user.id), eq(collections.slug, param)),
    })
  }

  if (!existing) {
    throw createError({
      statusCode: 404,
      message: 'Collection not found',
    })
  }

  if (existing.userId !== user.id) {
    throw createError({
      statusCode: 403,
      message: 'You can only delete your own collections',
    })
  }

  await db.delete(collections).where(eq(collections.id, existing.id))

  return { success: true }
})
