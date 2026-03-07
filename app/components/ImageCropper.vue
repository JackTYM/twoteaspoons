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

function loadImage(file: File): void {
  // Revoke previous URL to prevent memory leaks
  if (imageUrl.value) {
    URL.revokeObjectURL(imageUrl.value)
  }
  imageUrl.value = URL.createObjectURL(file)
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
          @click="($refs.fileInput as HTMLInputElement)?.click()"
          @drop="handleDrop"
          @dragover.prevent
        >
          <div class="flex flex-col items-center gap-3">
            <UIcon
              name="i-heroicons-photo"
              class="w-12 h-12 text-neutral-400"
            />
            <div>
              <p class="text-neutral-600 dark:text-neutral-300 font-medium">
                Drop an image here or click to browse
              </p>
              <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                JPG, PNG, WebP up to 10MB
              </p>
            </div>
          </div>
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

          <!-- Change image button -->
          <UButton
            size="sm"
            color="neutral"
            variant="solid"
            icon="i-heroicons-arrow-path"
            class="absolute top-2 right-2"
            @click="imageUrl = null"
          >
            Change
          </UButton>
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
