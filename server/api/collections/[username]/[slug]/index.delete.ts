import { eq, and } from 'drizzle-orm'
import { db, collections, users } from '../../../../db'
import { requireAuth } from '../../../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const username = getRouterParam(event, 'username')
  const slug = getRouterParam(event, 'slug')

  if (!username || !slug) {
    throw createError({
      statusCode: 400,
      message: 'Username and slug are required',
    })
  }

  // Find the collection owner by username
  const owner = await db.query.users.findFirst({
    where: eq(users.username, username),
  })

  if (!owner) {
    throw createError({
      statusCode: 404,
      message: 'Collection not found',
    })
  }

  // Find the collection
  const existing = await db.query.collections.findFirst({
    where: and(eq(collections.userId, owner.id), eq(collections.slug, slug)),
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

  await db.delete(collections).where(eq(collections.id, existing.id))

  return { success: true }
})
