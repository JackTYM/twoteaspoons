import type { H3Event } from 'h3'

export type ImageCategory = 'recipes' | 'avatars' | 'comments' | 'collections'

interface R2Bucket {
  put(key: string, value: ArrayBuffer | ReadableStream, options?: { httpMetadata?: { contentType?: string } }): Promise<void>
  delete(key: string): Promise<void>
  get(key: string): Promise<{ body: ReadableStream } | null>
}

interface CloudflareEnv {
  R2_BUCKET: R2Bucket
}

/**
 * Get R2 bucket from Cloudflare context
 */
function getR2Bucket(event: H3Event): R2Bucket {
  const context = event.context.cloudflare
  if (!context?.env?.R2_BUCKET) {
    throw createError({
      statusCode: 500,
      message: 'R2 bucket not configured',
    })
  }
  return (context.env as CloudflareEnv).R2_BUCKET
}

/**
 * Generate a unique key for an uploaded image
 */
function generateKey(
  category: ImageCategory,
  userId: string,
  filename: string,
  extension: string
): string {
  const timestamp = Date.now()
  const baseName = filename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9-]/g, '_')
  return `${category}/${userId}/${timestamp}-${baseName}${extension}`
}

/**
 * Upload an image to R2 using native Cloudflare bindings
 * Returns the public URL for the uploaded image
 */
export async function uploadImage(
  event: H3Event,
  file: ArrayBuffer,
  category: ImageCategory,
  userId: string,
  filename: string,
  contentType: string
): Promise<string> {
  const bucket = getR2Bucket(event)

  const extMap: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
  }
  const extension = extMap[contentType] || filename.match(/\.[^/.]+$/)?.[0] || '.webp'
  const key = generateKey(category, userId, filename, extension)

  await bucket.put(key, file, {
    httpMetadata: { contentType },
  })

  // Return public URL using R2_PUBLIC_URL from env
  const publicUrl = process.env.R2_PUBLIC_URL || ''
  return `${publicUrl}/${key}`
}

/**
 * Delete an image from R2
 * Extracts the key from a full URL or accepts a key directly
 */
export async function deleteImage(event: H3Event, urlOrKey: string): Promise<void> {
  const bucket = getR2Bucket(event)

  let key = urlOrKey
  const publicUrl = process.env.R2_PUBLIC_URL || ''
  if (urlOrKey.startsWith(publicUrl)) {
    key = urlOrKey.slice(publicUrl.length + 1) // +1 for trailing slash
  }

  await bucket.delete(key)
}
