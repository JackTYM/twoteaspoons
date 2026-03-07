import { eq, and } from 'drizzle-orm'
import { db, shoppingItems, shoppingLists } from '../../../../db'
import { requireAuth } from '../../../../utils/session'

interface UpdateItemBody {
  item?: string
  amount?: string | null
  unit?: string | null
  section?: string | null
  checked?: boolean
  sortOrder?: number
}

/**
 * Update a shopping list item by slug.
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

  // Build update object
  const updateData: Record<string, unknown> = {}

  if (body.item !== undefined) {
    if (!body.item.trim()) {
      throw createError({
        statusCode: 400,
        message: 'Item name cannot be empty',
      })
    }
    updateData.item = body.item.trim()
  }

  if (body.amount !== undefined) {
    updateData.amount = body.amount?.trim() || null
  }

  if (body.unit !== undefined) {
    updateData.unit = body.unit?.trim() || null
  }

  if (body.section !== undefined) {
    updateData.section = body.section?.trim() || null
  }

  if (body.checked !== undefined) {
    updateData.checked = body.checked
  }

  if (body.sortOrder !== undefined) {
    updateData.sortOrder = body.sortOrder
  }

  if (Object.keys(updateData).length === 0) {
    return { item: existing }
  }

  const [updated] = await db
    .update(shoppingItems)
    .set(updateData)
    .where(eq(shoppingItems.id, itemId))
    .returning()

  return { item: updated }
})
