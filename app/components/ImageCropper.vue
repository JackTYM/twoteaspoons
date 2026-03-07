<script setup lang="ts">
import { Cropper } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'

interface Props {
  modelValue: boolean
  aspectRatio?: number
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  aspectRatio: 16 / 9,
  title: 'Crop Image',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'crop': [blob: Blob]
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const cropperRef = ref<InstanceType<typeof Cropper> | null>(null)
const imageUrl = ref<string | null>(null)
const loading = ref(false)
const rotation = ref(0)

function handleFileSelect(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    loadImage(file)
  }
}

function handleDrop(event: DragEvent): void {
  event.preventDefault()
  const file = event.dataTransfer?.files[0]
  if (file && file.type.startsWith('image/')) {
    loadImage(file)
  }
}

// Handle paste from clipboard (image blob or URL)
async function handlePaste(event: ClipboardEvent): Promise<void> {
  const items = event.clipboardData?.items
  if (!items) return

  // First, check for image blob
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) {
        loadImage(file)
        event.preventDefault()
        return
      }
    }
  }

  // If no image blob, check for text that might be an image URL
  const text = event.clipboardData?.getData('text/plain')?.trim()
  if (text && isImageUrl(text)) {
    event.preventDefault()
    await loadImageFromUrl(text)
  }
}

// Check if a string looks like an image URL
function isImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    // Check protocol
    if (!['http:', 'https:'].includes(parsed.protocol)) return false
    // Check file extension or common image CDN patterns
    const path = parsed.pathname.toLowerCase()
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg']
    if (imageExtensions.some(ext => path.endsWith(ext))) return true
    // Common image CDN patterns
    if (parsed.hostname.includes('imgur') ||
        parsed.hostname.includes('cloudinary') ||
        parsed.hostname.includes('unsplash') ||
        parsed.hostname.includes('pexels') ||
        parsed.hostname.includes('r2.cloudflarestorage') ||
        path.includes('/image/') ||
        path.includes('/photo/') ||
        path.includes('/img/')) return true
    return false
  } catch {
    return false
  }
}

// Load an image from URL
const loadingUrl = ref(false)
const urlError = ref<string | null>(null)

async function loadImageFromUrl(url: string): Promise<void> {
  loadingUrl.value = true
  urlError.value = null

  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`)
    }

    const contentType = response.headers.get('content-type')
    if (!contentType?.startsWith('image/')) {
      throw new Error('URL does not point to an image')
    }

    const blob = await response.blob()
    const file = new File([blob], 'pasted-image', { type: blob.type })
    loadImage(file)
  } catch (err) {
    urlError.value = err instanceof Error ? err.message : 'Failed to load image'
    console.error('Failed to load image from URL:', err)
  } finally {
    loadingUrl.value = false
  }
}

// Listen for paste events when modal is open
watch(isOpen, (open) => {
  if (open) {
    document.addEventListener('paste', handlePaste)
  } else {
    document.removeEventListener('paste', handlePaste)
  }
})

// Cleanup paste listener on unmount
onUnmounted(() => {
  document.removeEventListener('paste', handlePaste)
})

function loadImage(file: File): void {
  // Revoke previous URL to prevent memory leaks
  if (imageUrl.value) {
    URL.revokeObjectURL(imageUrl.value)
  }
  imageUrl.value = URL.createObjectURL(file)
  rotation.value = 0 // Reset rotation when loading new image
  urlError.value = null // Clear any previous errors
}

// Rotation controls
function rotateLeft(): void {
  rotation.value -= 90
  cropperRef.value?.rotate(-90)
}

function rotateRight(): void {
  rotation.value += 90
  cropperRef.value?.rotate(90)
}

async function handleCrop(): Promise<void> {
  if (!cropperRef.value) return

  loading.value = true

  try {
    const { canvas } = cropperRef.value.getResult()
    if (!canvas) return

    // Convert canvas to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Failed to create blob'))
        },
        'image/jpeg',
        0.9
      )
    })

    emit('crop', blob)
    handleClose()
  } finally {
    loading.value = false
  }
}

function handleClose(): void {
  if (imageUrl.value) {
    URL.revokeObjectURL(imageUrl.value)
    imageUrl.value = null
  }
  isOpen.value = false
}

// Cleanup on unmount
onUnmounted(() => {
  if (imageUrl.value) {
    URL.revokeObjectURL(imageUrl.value)
  }
})
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="title"
    class="sm:max-w-2xl"
  >
    <template #body>
      <div class="space-y-4">
        <!-- File selection area (shown when no image loaded) -->
        <div
          v-if="!imageUrl"
          class="border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl p-8 text-center cursor-pointer hover:border-primary-400 dark:hover:border-primary-500 transition-colors"
          :class="{ 'pointer-events-none opacity-50': loadingUrl }"
          @click="($refs.fileInput as HTMLInputElement)?.click()"
          @drop="handleDrop"
          @dragover.prevent
        >
          <div class="flex flex-col items-center gap-3">
            <UIcon
              v-if="loadingUrl"
              name="i-heroicons-arrow-path"
              class="w-12 h-12 text-primary-500 animate-spin"
            />
            <UIcon
              v-else
              name="i-heroicons-photo"
              class="w-12 h-12 text-neutral-400"
            />
            <div>
              <p v-if="loadingUrl" class="text-neutral-600 dark:text-neutral-300 font-medium">
                Loading image from URL...
              </p>
              <template v-else>
                <p class="text-neutral-600 dark:text-neutral-300 font-medium">
                  Drop, paste, or click to select an image
                </p>
                <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  JPG, PNG, WebP up to 10MB
                </p>
                <p class="text-xs text-neutral-400 dark:text-neutral-500 mt-2">
                  <kbd class="px-1.5 py-0.5 bg-neutral-200 dark:bg-neutral-700 rounded text-xs">Ctrl+V</kbd> to paste image or URL
                </p>
              </template>
            </div>
          </div>
          <!-- URL error message -->
          <p
            v-if="urlError"
            class="mt-3 text-sm text-terracotta-600 dark:text-terracotta-400"
          >
            {{ urlError }}
          </p>
          <input
            ref="fileInput"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            class="hidden"
            @change="handleFileSelect"
          >
        </div>

        <!-- Cropper (shown when image is loaded) -->
        <div
          v-else
          class="relative"
        >
          <Cropper
            ref="cropperRef"
            :src="imageUrl"
            :stencil-props="{
              aspectRatio: aspectRatio,
            }"
            class="h-[400px] rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800"
          />

          <!-- Top controls -->
          <div class="absolute top-2 right-2 flex gap-1">
            <!-- Rotation buttons -->
            <UButton
              size="sm"
              color="neutral"
              variant="solid"
              icon="i-heroicons-arrow-uturn-left"
              title="Rotate left"
              @click="rotateLeft"
            />
            <UButton
              size="sm"
              color="neutral"
              variant="solid"
              icon="i-heroicons-arrow-uturn-right"
              title="Rotate right"
              @click="rotateRight"
            />
            <!-- Change image button -->
            <UButton
              size="sm"
              color="neutral"
              variant="solid"
              icon="i-heroicons-arrow-path"
              @click="imageUrl = null"
            >
              Change
            </UButton>
          </div>
        </div>

        <!-- Aspect ratio hint -->
        <p class="text-xs text-neutral-500 dark:text-neutral-400 text-center">
          Image will be cropped to {{ aspectRatio === 16/9 ? '16:9' : aspectRatio === 1 ? '1:1' : aspectRatio.toFixed(2) }} aspect ratio
        </p>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          @click="handleClose"
        >
          Cancel
        </UButton>
        <UButton
          color="primary"
          :disabled="!imageUrl"
          :loading="loading"
          @click="handleCrop"
        >
          Crop & Upload
        </UButton>
      </div>
    </template>
  </UModal>
</template>
