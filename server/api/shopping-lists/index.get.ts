import { eq, desc } from 'drizzle-orm'
import { db, shoppingLists, shoppingItems } from '../../db'

export default defineEventHandler(async () => {
  // TODO: Get userId from session
  const userId = 1

  const lists = await db.query.shoppingLists.findMany({
    where: eq(shoppingLists.userId, userId),
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
