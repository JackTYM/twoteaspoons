import { uploadImage, type ImageCategory } from '../utils/r2'

export default defineEventHandler(async (event) => {
  const formData = await readFormData(event)
  const file = formData.get('file') as File | null
  const category = (formData.get('category') as ImageCategory) || 'recipes'

  if (!file) {
    throw createError({
      statusCode: 400,
      message: 'No file provided',
    })
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF',
    })
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    throw createError({
      statusCode: 400,
      message: 'File too large. Maximum size is 10MB',
    })
  }

  // TODO: Get userId from session
  const userId = 1

  const buffer = Buffer.from(await file.arrayBuffer())
  const url = await uploadImage(buffer, category, userId, file.name, file.type)

  return { url }
})
