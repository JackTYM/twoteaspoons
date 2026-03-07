import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import sharp from 'sharp'

// R2 client configured for Cloudflare
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_PUBLIC_URL,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const BUCKET = process.env.R2_BUCKET_NAME!

export type ImageCategory = 'recipes' | 'avatars' | 'comments' | 'collections'

// Image compression settings by category
const IMAGE_SETTINGS: Record<ImageCategory, { maxWidth: number; maxHeight: number; quality: number }> = {
  recipes: { maxWidth: 1920, maxHeight: 1080, quality: 80 },
  avatars: { maxWidth: 400, maxHeight: 400, quality: 85 },
  comments: { maxWidth: 1200, maxHeight: 900, quality: 75 },
  collections: { maxWidth: 1200, maxHeight: 800, quality: 80 },
}

/**
 * Compress and optimize an image
 * Converts to WebP for best compression, resizes to max dimensions
 */
async function compressImage(
  buffer: Buffer,
  category: ImageCategory
): Promise<{ data: Buffer; contentType: string; extension: string }> {
  const settings = IMAGE_SETTINGS[category]

  const compressed = await sharp(buffer)
    .resize(settings.maxWidth, settings.maxHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: settings.quality })
    .toBuffer()

  return {
    data: compressed,
    contentType: 'image/webp',
    extension: '.webp',
  }
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
  // Remove existing extension and sanitize filename
  const baseName = filename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9-]/g, '_')
  return `${category}/${userId}/${timestamp}-${baseName}${extension}`
}

/**
 * Upload an image to R2
 * Compresses and converts to WebP before uploading
 * Returns either a public URL (if R2_CDN_URL is set) or a presigned URL
 */
export async function uploadImage(
  file: Buffer,
  category: ImageCategory,
  userId: string,
  filename: string,
  _contentType: string
): Promise<string> {
  // Compress and convert to WebP
  const { data, contentType, extension } = await compressImage(file, category)
  const key = generateKey(category, userId, filename, extension)

  console.log(`[R2] Uploading ${filename}: ${(file.length / 1024).toFixed(0)}KB -> ${(data.length / 1024).toFixed(0)}KB (${((1 - data.length / file.length) * 100).toFixed(0)}% reduction)`)

  await r2Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: data,
      ContentType: contentType,
    })
  )

  // If a CDN/public URL is configured, use that
  if (process.env.R2_CDN_URL) {
    return `${process.env.R2_CDN_URL}/${key}`
  }

  // Otherwise, return a long-lived presigned URL (7 days)
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  })
  return await getSignedUrl(r2Client, command, { expiresIn: 7 * 24 * 3600 })
}

/**
 * Generate a presigned URL for direct client upload
 * Client can PUT directly to this URL within the expiration time
 * Note: Direct uploads skip server-side compression
 */
export async function getUploadUrl(
  category: ImageCategory,
  userId: string,
  filename: string,
  contentType: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<{ uploadUrl: string; publicUrl: string }> {
  // Extract extension from content type
  const extMap: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
  }
  const extension = extMap[contentType] || '.jpg'
  const key = generateKey(category, userId, filename, extension)

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  })

  const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn })
  const publicUrl = `${process.env.R2_PUBLIC_URL}/${BUCKET}/${key}`

  return { uploadUrl, publicUrl }
}

/**
 * Generate a presigned URL for reading a private object
 * Use this if objects are not publicly accessible
 */
export async function getReadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  })

  return await getSignedUrl(r2Client, command, { expiresIn })
}

/**
 * Delete an image from R2
 * Extracts the key from a full URL or accepts a key directly
 */
export async function deleteImage(urlOrKey: string): Promise<void> {
  // Extract key from full URL if needed
  let key = urlOrKey
  const bucketPrefix = `${process.env.R2_PUBLIC_URL}/${BUCKET}/`
  if (urlOrKey.startsWith(bucketPrefix)) {
    key = urlOrKey.slice(bucketPrefix.length)
  }

  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  )
}

/**
 * Extract the key from a full R2 URL
 */
export function extractKeyFromUrl(url: string): string | null {
  const bucketPrefix = `${process.env.R2_PUBLIC_URL}/${BUCKET}/`
  if (url.startsWith(bucketPrefix)) {
    return url.slice(bucketPrefix.length)
  }
  return null
}

export { r2Client, BUCKET }
