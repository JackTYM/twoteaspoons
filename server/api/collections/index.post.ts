import { db, collections } from '../../db'
import { requireAuth } from '../../utils/session'

interface CreateCollectionBody {
  name: string
  description?: string
  isPublic?: boolean
  coverPhoto?: string
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody<CreateCollectionBody>(event)

  if (!body.name?.trim()) {
    throw createError({
      statusCode: 400,
      message: 'Name is required',
    })
  }

  const [newCollection] = await db.insert(collections).values({
    userId: user.id,
    name: body.name.trim(),
    description: body.description?.trim() || null,
    isPublic: body.isPublic ?? false,
    coverPhoto: body.coverPhoto || null,
  }).returning()

  if (!newCollection) {
    throw createError({
      statusCode: 500,
      message: 'Failed to create collection',
    })
  }

  return { collection: newCollection }
})
