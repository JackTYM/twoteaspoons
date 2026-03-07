import { eq, and } from 'drizzle-orm'
import { db, shoppingItems, shoppingLists } from '../../../../db'
import { requireAuth } from '../../../../utils/session'

interface UpdateItemBody {
  checked?: boolean
}

/**
 * Toggle checked status for a shopping list item by slug.
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const slug = getRouterParam(event, 'slug')
  const itemId = Number(getRouterParam(event, 'itemId'))
  const body = await readBody<UpdateItemBody>(event)

  if (!slug) {
    throw createError({
      statusCode: 400,
      message: 'Slug is required',
    })
  }

  if (isNaN(itemId)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid item ID',
    })
  }

  // Check list ownership
  const list = await db.query.shoppingLists.findFirst({
    where: and(eq(shoppingLists.userId, user.id), eq(shoppingLists.slug, slug)),
  })

  if (!list) {
    throw createError({
      statusCode: 404,
      message: 'Shopping list not found',
    })
  }

  const existing = await db.query.shoppingItems.findFirst({
    where: eq(shoppingItems.id, itemId),
  })

  if (!existing || existing.listId !== list.id) {
    throw createError({
      statusCode: 404,
      message: 'Item not found',
    })
  }

  const [updated] = await db
    .update(shoppingItems)
    .set({
      checked: body.checked ?? !existing.checked,
    })
    .where(eq(shoppingItems.id, itemId))
    .returning()

  return { item: updated }
})
