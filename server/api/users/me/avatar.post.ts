import { eq } from 'drizzle-orm'
import { db, users } from '../../../db'
import { requireAuth } from '../../../utils/session'
import { uploadImage, deleteImage } from '../../../utils/r2'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  // Read multipart form data
  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'No file uploaded',
    })
  }

  const file = formData.find(f => f.name === 'file' || f.name === 'avatar')
  if (!file || !file.data) {
    throw createError({
      statusCode: 400,
      message: 'No file found in request',
    })
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!file.type || !allowedTypes.includes(file.type)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.',
    })
  }

  // Validate file size (max 5MB)
  if (file.data.length > 5 * 1024 * 1024) {
    throw createError({
      statusCode: 400,
      message: 'File too large. Maximum size is 5MB.',
    })
  }

  // Get current avatar to delete after successful upload
  const currentUser = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { avatar: true },
  })
  const oldAvatar = currentUser?.avatar

  // Upload new avatar - convert Buffer to ArrayBuffer
  const arrayBuffer = new Uint8Array(file.data).buffer as ArrayBuffer
  const avatarUrl = await uploadImage(
    event,
    arrayBuffer,
    'avatars',
    user.id,
    file.filename || 'avatar',
    file.type
  )

  // Update user record
  const [updatedUser] = await db
    .update(users)
    .set({
      avatar: avatarUrl,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))
    .returning()

  // Delete old avatar if it exists
  if (oldAvatar) {
    try {
      await deleteImage(event, oldAvatar)
    } catch (err) {
      // Don't fail if we can't delete the old avatar
      console.error('Failed to delete old avatar:', err)
    }
  }

  return { user: updatedUser, avatarUrl }
})
