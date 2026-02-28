import { eq, desc } from 'drizzle-orm'
import { db, shoppingLists, shoppingItems } from '../../db'
import { requireAuth } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const lists = await db.query.shoppingLists.findMany({
    where: eq(shoppingLists.userId, user.id),
    orderBy: [desc(shoppingLists.createdAt)],
  })

  // Get item counts for each list
  const listsWithCounts = await Promise.all(
    lists.map(async (list) => {
      const items = await db.query.shoppingItems.findMany({
        where: eq(shoppingItems.listId, list.id),
      })
      const checkedCount = items.filter(i => i.checked).length
      return {
        ...list,
        itemCount: items.length,
        checkedCount,
      }
    })
  )

  return { lists: listsWithCounts }
})
