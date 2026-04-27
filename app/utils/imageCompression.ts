export type ImageCategory = 'recipes' | 'avatars' | 'comments' | 'collections'

const IMAGE_SETTINGS: Record<ImageCategory, { maxWidth: number; maxHeight: number; quality: number }> = {
  recipes: { maxWidth: 1920, maxHeight: 1080, quality: 0.8 },
  avatars: { maxWidth: 400, maxHeight: 400, quality: 0.85 },
  comments: { maxWidth: 1200, maxHeight: 900, quality: 0.75 },
  collections: { maxWidth: 1200, maxHeight: 800, quality: 0.8 },
}

/**
 * Compress an image file using canvas on the client side
 * Resizes to max dimensions and converts to WebP
 */
export async function compressImage(
  file: File,
  category: ImageCategory
): Promise<{ blob: Blob; filename: string }> {
  const settings = IMAGE_SETTINGS[category]

  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Failed to get canvas context'))
      return
    }

    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img

      if (width > settings.maxWidth || height > settings.maxHeight) {
        const ratio = Math.min(settings.maxWidth / width, settings.maxHeight / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      canvas.width = width
      canvas.height = height

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'))
            return
          }

          // Generate filename with webp extension
          const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9-]/g, '_')
          const filename = `${baseName}.webp`

          resolve({ blob, filename })
        },
        'image/webp',
        settings.quality
      )
    }

    img.onerror = () => {
      reject(new Error('Failed to load image'))
    }

    // Load the image from the file
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Convert a Blob to a base64 data URL
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Convert a Blob to ArrayBuffer for upload
 */
export function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return blob.arrayBuffer()
}
