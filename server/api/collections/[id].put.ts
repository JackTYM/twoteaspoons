import { eq } from 'drizzle-orm'
import { db, collections } from '../../db'
import { requireAuth } from '../../utils/session'

interface UpdateCollectionBody {
  name?: string
  description?: string
  isPublic?: boolean
  coverPhoto?: string
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<UpdateCollectionBody>(event)

  if (isNaN(id)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid collection ID',
    })
  }

  const existing = await db.query.collections.findFirst({
    where: eq(collections.id, id),
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

  const [updated] = await db.update(collections)
    .set({
      name: body.name?.trim() || existing.name,
      description: body.description?.trim() ?? existing.description,
      isPublic: body.isPublic ?? existing.isPublic,
      coverPhoto: body.coverPhoto ?? existing.coverPhoto,
    })
    .where(eq(collections.id, id))
    .returning()

  return { collection: updated }
})
