import { eq } from 'drizzle-orm'
import { db, shoppingItems, shoppingLists } from '../../../../db'
import { requireAuth } from '../../../../utils/session'

interface UpdateItemBody {
  checked?: boolean
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const listId = Number(getRouterParam(event, 'id'))
  const itemId = Number(getRouterParam(event, 'itemId'))
  const body = await readBody<UpdateItemBody>(event)

  if (isNaN(itemId) || isNaN(listId)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid ID',
    })
  }

  // Check list ownership
  const list = await db.query.shoppingLists.findFirst({
    where: eq(shoppingLists.id, listId),
  })

  if (!list) {
    throw createError({
      statusCode: 404,
      message: 'Shopping list not found',
    })
  }

  if (list.userId !== user.id) {
    throw createError({
      statusCode: 403,
      message: 'You can only modify your own shopping lists',
    })
  }

  const existing = await db.query.shoppingItems.findFirst({
    where: eq(shoppingItems.id, itemId),
  })

  if (!existing || existing.listId !== listId) {
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
