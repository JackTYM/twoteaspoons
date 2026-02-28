import { eq } from 'drizzle-orm'
import { db, shoppingItems } from '../../../../db'

interface UpdateItemBody {
  checked?: boolean
}

export default defineEventHandler(async (event) => {
  const itemId = Number(getRouterParam(event, 'itemId'))
  const body = await readBody<UpdateItemBody>(event)

  if (isNaN(itemId)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid item ID',
    })
  }

  const existing = await db.query.shoppingItems.findFirst({
    where: eq(shoppingItems.id, itemId),
  })

  if (!existing) {
    throw createError({
      statusCode: 404,
      message: 'Item not found',
    })
  }

  const [updated] = await db.update(shoppingItems)
    .set({
      checked: body.checked ?? !existing.checked,
    })
    .where(eq(shoppingItems.id, itemId))
    .returning()

  return { item: updated }
})
