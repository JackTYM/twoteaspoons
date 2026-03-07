import { eq, and } from 'drizzle-orm'
import { db, shoppingLists } from '../../../db'
import { requireAuth } from '../../../utils/session'
import { getUniqueShoppingListSlug } from '../../../utils/slug'

interface UpdateListBody {
  name?: string
}

/**
 * Update a shopping list by slug for the authenticated user.
 * Returns the new slug if the name changed.
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const slug = getRouterParam(event, 'slug')
  const body = await readBody<UpdateListBody>(event)

  if (!slug) {
    throw createError({
      statusCode: 400,
      message: 'Slug is required',
    })
  }

  const existing = await db.query.shoppingLists.findFirst({
    where: and(eq(shoppingLists.userId, user.id), eq(shoppingLists.slug, slug)),
  })

  if (!existing) {
    throw createError({
      statusCode: 404,
      message: 'Shopping list not found',
    })
  }

  const updateData: { name?: string; slug?: string } = {}
  if (body.name !== undefined) {
    if (!body.name.trim()) {
      throw createError({
        statusCode: 400,
        message: 'Name cannot be empty',
      })
    }
    const newName = body.name.trim()
    if (newName !== existing.name) {
      updateData.name = newName
      updateData.slug = await getUniqueShoppingListSlug(
        user.id,
        newName,
        existing.id
      )
    }
  }

  if (Object.keys(updateData).length === 0) {
    return { list: existing, slugChanged: false, newSlug: existing.slug }
  }

  const [updated] = await db
    .update(shoppingLists)
    .set(updateData)
    .where(eq(shoppingLists.id, existing.id))
    .returning()

  return {
    list: updated,
    slugChanged: updateData.slug !== undefined && updateData.slug !== slug,
    newSlug: updated?.slug,
  }
})
