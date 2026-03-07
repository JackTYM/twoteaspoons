import { eq, and } from 'drizzle-orm'
import { db, shoppingLists, shoppingItems } from '../../../db'
import { requireAuth } from '../../../utils/session'

/**
 * Get a shopping list by slug for the authenticated user.
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

  const list = await db.query.shoppingLists.findFirst({
    where: and(eq(shoppingLists.userId, user.id), eq(shoppingLists.slug, slug)),
  })

  if (!list) {
    throw createError({
      statusCode: 404,
      message: 'Shopping list not found',
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
  const sectionOrder = [
    'produce',
    'dairy',
    'meat',
    'seafood',
    'bakery',
    'frozen',
    'pantry',
    'beverages',
    'other',
  ]
  const sortedSections = Array.from(sections.entries())
    .sort((a, b) => sectionOrder.indexOf(a[0]) - sectionOrder.indexOf(b[0]))
    .map(([name, items]) => ({ name, items }))

  return {
    list,
    sections: sortedSections,
    totalItems: items.length,
    checkedItems: items.filter((i) => i.checked).length,
  }
})
