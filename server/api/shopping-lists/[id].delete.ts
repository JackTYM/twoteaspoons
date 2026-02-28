import { eq } from 'drizzle-orm'
import { db, shoppingLists } from '../../db'

export default defineEventHandler(async (event) => {
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

  // TODO: Check ownership once auth is integrated

  await db.delete(shoppingLists).where(eq(shoppingLists.id, id))

  return { success: true }
})
