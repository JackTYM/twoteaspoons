import { eq, and, inArray } from 'drizzle-orm'
import { db, shoppingItems, shoppingLists } from '../../../../db'
import { requireAuth } from '../../../../utils/session'

interface ReorderItem {
  id: number
  sortOrder: number
  section?: string
}

interface ReorderBody {
  items: ReorderItem[]
}

/**
 * Reorder items in a shopping list by slug.
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const slug = getRouterParam(event, 'slug')
  const body = await readBody<ReorderBody>(event)

  if (!slug) {
    throw createError({
      statusCode: 400,
      message: 'Slug is required',
    })
  }

  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'Items array is required',
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

  // Verify all items belong to this list
  const itemIds = body.items.map((i) => i.id)
  const existingItems = await db.query.shoppingItems.findMany({
    where: inArray(shoppingItems.id, itemIds),
  })

  const existingItemMap = new Map(existingItems.map((i) => [i.id, i]))

  for (const item of body.items) {
    const existing = existingItemMap.get(item.id)
    if (!existing || existing.listId !== list.id) {
      throw createError({
        statusCode: 400,
        message: `Item ${item.id} does not belong to this list`,
      })
    }
  }

  // Update each item's sortOrder (and optionally section)
  const updates = body.items.map((item) => {
    const updateData: { sortOrder: number; section?: string } = {
      sortOrder: item.sortOrder,
    }
    if (item.section !== undefined) {
      updateData.section = item.section
    }
    return db
      .update(shoppingItems)
      .set(updateData)
      .where(eq(shoppingItems.id, item.id))
  })

  await Promise.all(updates)

  return { success: true, updatedCount: body.items.length }
})
