import { eq } from 'drizzle-orm'
import { db, shoppingLists, shoppingItems } from '../../db'
import { requireAuth } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = Number(getRouterParam(event, 'id'))

  if (isNaN(id)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid list ID',
    })
  }

  const list = await db.query.shoppingLists.findFirst({
    where: eq(shoppingLists.id, id),
  })

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
    where: eq(shoppingItems.listId, id),
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
