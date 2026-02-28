import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

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

/**
 * Generate a unique key for an uploaded image
 */
function generateKey(
  category: ImageCategory,
  userId: number,
  filename: string
): string {
  const timestamp = Date.now()
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
  return `${category}/${userId}/${timestamp}-${sanitizedFilename}`
}

/**
 * Upload an image to R2
 * Returns the public URL of the uploaded image
 */
export async function uploadImage(
  file: Buffer,
  category: ImageCategory,
  userId: number,
  filename: string,
  contentType: string
): Promise<string> {
  const key = generateKey(category, userId, filename)

  await r2Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: file,
      ContentType: contentType,
    })
  )

  // Return the public URL
  return `${process.env.R2_PUBLIC_URL}/${BUCKET}/${key}`
}

/**
 * Generate a presigned URL for direct client upload
 * Client can PUT directly to this URL within the expiration time
 */
export async function getUploadUrl(
  category: ImageCategory,
  userId: number,
  filename: string,
  contentType: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const key = generateKey(category, userId, filename)

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
