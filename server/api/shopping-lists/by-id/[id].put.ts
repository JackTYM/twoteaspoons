import { eq, and } from 'drizzle-orm'
import { db, shoppingLists } from '../../../db'
import { requireAuth } from '../../../utils/session'

interface UpdateListBody {
  name?: string
}

/**
 * Update shopping list by ID (numeric) or slug (string).
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const param = getRouterParam(event, 'id')
  const body = await readBody<UpdateListBody>(event)

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
      message: 'You can only update your own shopping lists',
    })
  }

  const updateData: Partial<typeof existing> = {}
  if (body.name !== undefined) {
    if (!body.name.trim()) {
      throw createError({
        statusCode: 400,
        message: 'Name cannot be empty',
      })
    }
    updateData.name = body.name.trim()
  }

  if (Object.keys(updateData).length === 0) {
    return { list: existing }
  }

  const [updated] = await db
    .update(shoppingLists)
    .set(updateData)
    .where(eq(shoppingLists.id, existing.id))
    .returning()

  return { list: updated }
})
