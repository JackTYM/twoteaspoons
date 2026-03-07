import { eq, and } from 'drizzle-orm'
import { db, shoppingLists, shoppingItems } from '../../../db'
import { requireAuth } from '../../../utils/session'

/**
 * Get shopping list by ID (numeric) or slug (string).
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const param = getRouterParam(event, 'id')

  if (!param) {
    throw createError({
      statusCode: 400,
      message: 'List ID or slug is required',
    })
  }

  // Check if param is numeric (legacy ID) or string (slug)
  const isNumericId = /^\d+$/.test(param)

  let list
  if (isNumericId) {
    list = await db.query.shoppingLists.findFirst({
      where: eq(shoppingLists.id, Number(param)),
    })
  } else {
    // Slug lookup
    list = await db.query.shoppingLists.findFirst({
      where: and(eq(shoppingLists.userId, user.id), eq(shoppingLists.slug, param)),
    })
  }

  if (!list) {
    throw createError({
      statusCode: 404,
      message: 'Shopping list not found',
    })
  }

  // Check ownership
  if (list.userId !== user.id) {
    throw createError({
      statusCode: 403,
      message: 'You can only view your own shopping lists',
    })
  }

  const items = await db.query.shoppingItems.findMany({
    where: eq(shoppingItems.listId, list.id),
  })

  // Group items by section
  const sections = new Map<string, typeof items>()
  for (const item of items) {
    const section = item.section || 'other'
    if (!sections.has(section)) {
      sections.set(section, [])
    }
    sections.get(section)!.push(item)
  }

  // Sort items within each section by sortOrder
  for (const sectionItems of sections.values()) {
    sectionItems.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  }

  // Sort sections
  const sectionOrder = ['produce', 'dairy', 'meat', 'seafood', 'bakery', 'frozen', 'pantry', 'beverages', 'other']
  const sortedSections = Array.from(sections.entries())
    .sort((a, b) => sectionOrder.indexOf(a[0]) - sectionOrder.indexOf(b[0]))
    .map(([name, items]) => ({ name, items }))

  return {
    list,
    sections: sortedSections,
    totalItems: items.length,
    checkedItems: items.filter(i => i.checked).length,
  }
})
