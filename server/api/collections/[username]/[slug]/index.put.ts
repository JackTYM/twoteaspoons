import { eq, and } from 'drizzle-orm'
import { db, collections, users } from '../../../../db'
import { requireAuth } from '../../../../utils/session'
import { getUniqueCollectionSlug } from '../../../../utils/slug'

interface UpdateCollectionBody {
  name?: string
  description?: string
  isPublic?: boolean
  coverPhoto?: string
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const username = getRouterParam(event, 'username')
  const slug = getRouterParam(event, 'slug')
  const body = await readBody<UpdateCollectionBody>(event)

  if (!username || !slug) {
    throw createError({
      statusCode: 400,
      message: 'Username and slug are required',
    })
  }

  // Find the collection owner by username
  const owner = await db.query.users.findFirst({
    where: eq(users.username, username),
  })

  if (!owner) {
    throw createError({
      statusCode: 404,
      message: 'Collection not found',
    })
  }

  // Find the collection
  const existing = await db.query.collections.findFirst({
    where: and(eq(collections.userId, owner.id), eq(collections.slug, slug)),
  })

  if (!existing) {
    throw createError({
      statusCode: 404,
      message: 'Collection not found',
    })
  }

  if (existing.userId !== user.id) {
    throw createError({
      statusCode: 403,
      message: 'You can only edit your own collections',
    })
  }

  // Generate new slug if name changed
  let newSlug = existing.slug
  if (body.name && body.name.trim() !== existing.name) {
    newSlug = await getUniqueCollectionSlug(user.id, body.name.trim(), existing.id)
  }

  const [updated] = await db
    .update(collections)
    .set({
      name: body.name?.trim() || existing.name,
      slug: newSlug,
      description: body.description?.trim() ?? existing.description,
      isPublic: body.isPublic ?? existing.isPublic,
      coverPhoto: body.coverPhoto ?? existing.coverPhoto,
    })
    .where(eq(collections.id, existing.id))
    .returning()

  return { collection: updated }
})
