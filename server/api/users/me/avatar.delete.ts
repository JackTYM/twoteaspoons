import { eq } from 'drizzle-orm'
import { db, users } from '../../../db'
import { requireAuth } from '../../../utils/session'
import { deleteImage } from '../../../utils/r2'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  // Get current avatar
  const currentUser = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { avatar: true },
  })

  if (!currentUser?.avatar) {
    // No avatar to delete
    return { success: true }
  }

  // Delete from R2
  try {
    await deleteImage(event, currentUser.avatar)
  } catch (err) {
    console.error('Failed to delete avatar from storage:', err)
  }

  // Update user record
  const [updatedUser] = await db
    .update(users)
    .set({
      avatar: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))
    .returning()

  return { user: updatedUser, success: true }
})
