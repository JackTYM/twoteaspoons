import { eq, and, sql } from 'drizzle-orm'
import { db, shoppingLists, shoppingItems } from '../../../../db'
import { requireAuth } from '../../../../utils/session'

interface AddItemBody {
  item: string
  amount?: string | null
  unit?: string | null
  section?: string | null
}

/**
 * Add an item to a shopping list by slug.
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const slug = getRouterParam(event, 'slug')
  const body = await readBody<AddItemBody>(event)

  if (!slug) {
    throw createError({
      statusCode: 400,
      message: 'Slug is required',
    })
  }

  if (!body.item?.trim()) {
    throw createError({
      statusCode: 400,
      message: 'Item name is required',
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

  // Get max sortOrder for this section
  const section = body.section || 'other'
  const maxOrderResult = await db
    .select({
      maxOrder: sql<number>`COALESCE(MAX(${shoppingItems.sortOrder}), -1)`,
    })
    .from(shoppingItems)
    .where(eq(shoppingItems.listId, list.id))

  const maxOrder = maxOrderResult[0]?.maxOrder ?? -1

  const [newItem] = await db
    .insert(shoppingItems)
    .values({
      listId: list.id,
      item: body.item.trim(),
      amount: body.amount?.trim() || null,
      unit: body.unit?.trim() || null,
      section,
      checked: false,
      sortOrder: maxOrder + 1,
    })
    .returning()

  return { item: newItem }
})
