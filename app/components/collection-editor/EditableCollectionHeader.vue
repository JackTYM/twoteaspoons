<script setup lang="ts">
interface Props {
  name: string
  description: string
  coverPhoto: string
  isPublic: boolean
  uploading?: boolean
  uploadError?: string
}

const props = withDefaults(defineProps<Props>(), {
  uploading: false,
  uploadError: '',
})

const emit = defineEmits<{
  'update:name': [value: string]
  'update:description': [value: string]
  'update:coverPhoto': [value: string]
  'update:isPublic': [value: boolean]
  'openCropper': []
  'removeImage': []
}>()

// Local refs for two-way binding
const localName = computed({
  get: () => props.name,
  set: (value) => emit('update:name', value),
})

const localDescription = computed({
  get: () => props.description,
  set: (value) => emit('update:description', value),
})

const localIsPublic = computed({
  get: () => props.isPublic,
  set: (value) => emit('update:isPublic', value),
})

// Image hover state
const imageHovered = ref(false)

// Generate gradient from name hash (for collections without cover photos)
function gradientForName(name: string): string {
  const defaultGradient = 'linear-gradient(135deg, #C97B5D 0%, #8FA878 100%)'
  if (!name) return defaultGradient

  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }

  const gradients = [
    'linear-gradient(135deg, #C97B5D 0%, #8FA878 100%)', // terracotta to sage
    'linear-gradient(135deg, #8FA878 0%, #F0D699 100%)', // sage to butter
    'linear-gradient(135deg, #F0D699 0%, #C97B5D 100%)', // butter to terracotta
    'linear-gradient(135deg, #96724D 0%, #CBA67A 100%)', // brown to light brown
    'linear-gradient(135deg, #6B4D35 0%, #C97B5D 100%)', // dark brown to terracotta
  ]

  return gradients[Math.abs(hash) % gradients.length] ?? defaultGradient
}
</script>

<template>
  <div class="editable-collection-header">
    <!-- Cover Photo Section -->
    <div
      class="relative overflow-hidden rounded-2xl aspect-[21/9] md:aspect-[3/1] mb-6 group"
      @mouseenter="imageHovered = true"
      @mouseleave="imageHovered = false"
    >
      <!-- Cover Image or Gradient -->
      <div
        v-if="coverPhoto"
        class="absolute inset-0"
      >
        <img
          :src="coverPhoto"
          alt="Collection cover"
          class="w-full h-full object-cover transition-transform duration-300"
          :class="{ 'scale-105': imageHovered }"
        >
        <div class="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      </div>
      <div
        v-else
        class="absolute inset-0"
        :style="{ background: gradientForName(name) }"
      >
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <UIcon
            name="i-heroicons-photo"
            class="w-16 h-16 text-white/60 mb-2"
          />
          <span class="text-white/80">
            Add a cover photo (optional)
          </span>
        </div>
      </div>

      <!-- Upload/Change Overlay -->
      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-show="imageHovered"
          class="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer"
          @click="emit('openCropper')"
        >
          <div
            v-if="uploading"
            class="flex flex-col items-center"
          >
            <UIcon
              name="i-heroicons-arrow-path"
              class="w-10 h-10 text-white animate-spin"
            />
            <span class="mt-2 text-white font-medium">Uploading...</span>
          </div>
          <div
            v-else
            class="flex flex-col items-center"
          >
            <UIcon
              :name="coverPhoto ? 'i-heroicons-camera' : 'i-heroicons-plus-circle'"
              class="w-10 h-10 text-white"
            />
            <span class="mt-2 text-white font-medium">
              {{ coverPhoto ? 'Change photo' : 'Add cover photo' }}
            </span>
          </div>
        </div>
      </Transition>

      <!-- Remove Button -->
      <div
        v-show="coverPhoto && imageHovered"
        class="absolute top-4 right-4 transition-opacity duration-200"
        :class="coverPhoto && imageHovered ? 'opacity-100' : 'opacity-0'"
      >
        <UButton
          type="button"
          color="error"
          variant="solid"
          icon="i-heroicons-trash"
          size="sm"
          @click.stop="emit('removeImage')"
        />
      </div>
    </div>

    <!-- Upload Error -->
    <UAlert
      v-if="uploadError"
      color="error"
      icon="i-heroicons-exclamation-circle"
      :title="uploadError"
      class="mb-6"
    />

    <!-- Name Input (styled like h1) -->
    <div class="mb-4">
      <input
        v-model="localName"
        type="text"
        placeholder="Collection name..."
        class="w-full text-3xl md:text-4xl font-display text-neutral-700 dark:text-neutral-100 bg-transparent border-none outline-none placeholder:text-neutral-300 dark:placeholder:text-neutral-600 focus:ring-0"
      >
    </div>

    <!-- Description Input -->
    <div class="mb-6">
      <textarea
        v-model="localDescription"
        placeholder="Add a description (optional)..."
        rows="2"
        class="w-full text-lg text-neutral-600 dark:text-neutral-300 bg-transparent border-none outline-none placeholder:text-neutral-300 dark:placeholder:text-neutral-600 resize-none focus:ring-0"
      />
    </div>

    <!-- Visibility Toggle -->
    <div class="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-xl flex items-center justify-center"
            :class="localIsPublic ? 'bg-sage-100 dark:bg-sage-900/30' : 'bg-neutral-200 dark:bg-neutral-700'"
          >
            <UIcon
              :name="localIsPublic ? 'i-heroicons-globe-alt' : 'i-heroicons-lock-closed'"
              class="w-5 h-5"
              :class="localIsPublic ? 'text-sage-600 dark:text-sage-400' : 'text-neutral-500 dark:text-neutral-400'"
            />
          </div>
          <div>
            <p class="font-medium text-neutral-700 dark:text-neutral-200">
              {{ localIsPublic ? 'Public collection' : 'Private collection' }}
            </p>
            <p class="text-sm text-neutral-500 dark:text-neutral-400">
              {{ localIsPublic ? 'Anyone can view this collection' : 'Only you can see this collection' }}
            </p>
          </div>
        </div>
        <USwitch
          v-model="localIsPublic"
          size="lg"
        />
      </div>
    </div>
  </div>
</template>
