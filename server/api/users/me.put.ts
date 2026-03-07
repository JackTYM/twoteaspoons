import { eq } from 'drizzle-orm'
import { db, users } from '../../db'
import { requireAuth } from '../../utils/session'

interface UpdateProfileBody {
  name?: string
  bio?: string
  username?: string
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody<UpdateProfileBody>(event)

  const updateData: Partial<typeof users.$inferInsert> = {}

  if (body.name !== undefined) {
    if (!body.name.trim()) {
      throw createError({
        statusCode: 400,
        message: 'Name cannot be empty',
      })
    }
    updateData.name = body.name.trim()
  }

  if (body.bio !== undefined) {
    updateData.bio = body.bio.trim() || null
  }

  if (body.username !== undefined) {
    const newUsername = body.username.trim().toLowerCase()
    if (!newUsername) {
      throw createError({
        statusCode: 400,
        message: 'Username cannot be empty',
      })
    }

    // Validate username format
    if (!/^[a-z0-9_-]+$/.test(newUsername)) {
      throw createError({
        statusCode: 400,
        message: 'Username can only contain letters, numbers, underscores, and hyphens',
      })
    }

    if (newUsername.length < 3 || newUsername.length > 30) {
      throw createError({
        statusCode: 400,
        message: 'Username must be between 3 and 30 characters',
      })
    }

    // Check if username is taken by another user
    const existingUser = await db.query.users.findFirst({
      where: eq(users.username, newUsername),
    })

    if (existingUser && existingUser.id !== user.id) {
      throw createError({
        statusCode: 409,
        message: 'Username is already taken',
      })
    }

    updateData.username = newUsername
  }

  if (Object.keys(updateData).length === 0) {
    // Nothing to update, return current user
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    })
    return { user: currentUser }
  }

  updateData.updatedAt = new Date()

  const [updatedUser] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, user.id))
    .returning()

  return { user: updatedUser }
})
