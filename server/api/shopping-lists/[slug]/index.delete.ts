import { eq, and } from 'drizzle-orm'
import { db, shoppingLists } from '../../../db'
import { requireAuth } from '../../../utils/session'

/**
 * Delete a shopping list by slug for the authenticated user.
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({
      statusCode: 400,
      message: 'Slug is required',
    })
  }

  const existing = await db.query.shoppingLists.findFirst({
    where: and(eq(shoppingLists.userId, user.id), eq(shoppingLists.slug, slug)),
  })

  if (!existing) {
    throw createError({
      statusCode: 404,
      message: 'Shopping list not found',
    })
  }

  await db.delete(shoppingLists).where(eq(shoppingLists.id, existing.id))

  return { success: true }
})
