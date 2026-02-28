import { eq } from 'drizzle-orm'
import { db, collections } from '../../db'
import { requireAuth } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = Number(getRouterParam(event, 'id'))

  if (isNaN(id)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid collection ID',
    })
  }

  const existing = await db.query.collections.findFirst({
    where: eq(collections.id, id),
  })

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

  await db.delete(collections).where(eq(collections.id, id))

  return { success: true }
})
