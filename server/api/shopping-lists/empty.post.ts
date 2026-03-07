import { db, shoppingLists } from '../../db'
import { requireAuth } from '../../utils/session'
import { getUniqueShoppingListSlug } from '../../utils/slug'

interface CreateEmptyListBody {
  name: string
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody<CreateEmptyListBody>(event)

  if (!body.name?.trim()) {
    throw createError({
      statusCode: 400,
      message: 'Name is required',
    })
  }

  const slug = await getUniqueShoppingListSlug(user.id, body.name.trim())

  // Create empty shopping list
  const [newList] = await db.insert(shoppingLists).values({
    userId: user.id,
    name: body.name.trim(),
    slug,
  }).returning()

  if (!newList) {
    throw createError({
      statusCode: 500,
      message: 'Failed to create shopping list',
    })
  }

  return { list: newList, itemCount: 0 }
})
