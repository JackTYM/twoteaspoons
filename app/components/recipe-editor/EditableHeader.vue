<script setup lang="ts">
interface Props {
  title: string
  description: string
  coverPhoto: string
  prepTime: number | null
  cookTime: number | null
  servings: number
  isPublished: boolean
  uploading?: boolean
  uploadError?: string
}

const props = withDefaults(defineProps<Props>(), {
  uploading: false,
  uploadError: '',
})

const emit = defineEmits<{
  'update:title': [value: string]
  'update:description': [value: string]
  'update:coverPhoto': [value: string]
  'update:prepTime': [value: number | null]
  'update:cookTime': [value: number | null]
  'update:servings': [value: number]
  'update:isPublished': [value: boolean]
  'openCropper': []
  'removeImage': []
}>()

// Local refs for two-way binding
const localTitle = computed({
  get: () => props.title,
  set: (value) => emit('update:title', value),
})

const localDescription = computed({
  get: () => props.description,
  set: (value) => emit('update:description', value),
})

const localPrepTime = computed({
  get: () => props.prepTime,
  set: (value) => emit('update:prepTime', value),
})

const localCookTime = computed({
  get: () => props.cookTime,
  set: (value) => emit('update:cookTime', value),
})

const localServings = computed({
  get: () => props.servings,
  set: (value) => emit('update:servings', value),
})

const localIsPublished = computed({
  get: () => props.isPublished,
  set: (value) => emit('update:isPublished', value),
})

// Image hover state
const imageHovered = ref(false)
</script>

<template>
  <div class="editable-header">
    <!-- Cover Photo Section -->
    <div
      class="relative overflow-hidden rounded-2xl aspect-[21/9] md:aspect-[3/1] mb-6 group"
      @mouseenter="imageHovered = true"
      @mouseleave="imageHovered = false"
    >
      <!-- Cover Image or Upload Placeholder -->
      <div
        v-if="coverPhoto"
        class="absolute inset-0"
      >
        <img
          :src="coverPhoto"
          alt="Cover photo preview"
          class="w-full h-full object-cover transition-transform duration-300"
          :class="{ 'scale-105': imageHovered }"
        >
        <!-- Gradient Overlay -->
        <div class="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      </div>
      <div
        v-else
        class="absolute inset-0 bg-gradient-to-br from-primary-100 to-terracotta-100 dark:from-primary-900/50 dark:to-terracotta-900/50"
      >
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <UIcon
            name="i-heroicons-photo"
            class="w-16 h-16 text-neutral-400 dark:text-neutral-600 mb-2"
          />
          <span class="text-neutral-500 dark:text-neutral-400">
            Add a cover photo
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
          v-if="imageHovered || !coverPhoto"
          class="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
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
      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="coverPhoto && imageHovered"
          class="absolute top-4 right-4"
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
      </Transition>
    </div>

    <!-- Upload Error -->
    <UAlert
      v-if="uploadError"
      color="error"
      icon="i-heroicons-exclamation-circle"
      :title="uploadError"
      class="mb-6"
    />

    <!-- Title Input (styled like h1) -->
    <div class="mb-4">
      <input
        v-model="localTitle"
        type="text"
        placeholder="Recipe title..."
        class="w-full text-3xl md:text-4xl lg:text-5xl font-display text-neutral-700 dark:text-neutral-100 bg-transparent border-none outline-none placeholder:text-neutral-300 dark:placeholder:text-neutral-600 focus:ring-0"
      >
    </div>

    <!-- Description Input (styled like subtitle) -->
    <div class="mb-6">
      <textarea
        v-model="localDescription"
        placeholder="Add a description..."
        rows="2"
        class="w-full text-lg text-neutral-600 dark:text-neutral-300 bg-transparent border-none outline-none placeholder:text-neutral-300 dark:placeholder:text-neutral-600 resize-none focus:ring-0"
      />
    </div>

    <!-- Metadata Grid -->
    <div class="flex flex-wrap items-center gap-3 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
      <!-- Prep Time -->
      <div class="flex items-center gap-2">
        <div class="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-neutral-700 rounded-lg shadow-sm">
          <UIcon
            name="i-heroicons-clock"
            class="w-4 h-4 text-neutral-500 dark:text-neutral-400"
          />
          <span class="text-sm text-neutral-500 dark:text-neutral-400">Prep:</span>
          <input
            v-model.number="localPrepTime"
            type="number"
            min="0"
            placeholder="0"
            class="w-14 text-sm font-medium text-neutral-700 dark:text-neutral-200 bg-transparent border-none outline-none text-center focus:ring-0"
          >
          <span class="text-sm text-neutral-500 dark:text-neutral-400">min</span>
        </div>
      </div>

      <!-- Cook Time -->
      <div class="flex items-center gap-2">
        <div class="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-neutral-700 rounded-lg shadow-sm">
          <UIcon
            name="i-heroicons-fire"
            class="w-4 h-4 text-neutral-500 dark:text-neutral-400"
          />
          <span class="text-sm text-neutral-500 dark:text-neutral-400">Cook:</span>
          <input
            v-model.number="localCookTime"
            type="number"
            min="0"
            placeholder="0"
            class="w-14 text-sm font-medium text-neutral-700 dark:text-neutral-200 bg-transparent border-none outline-none text-center focus:ring-0"
          >
          <span class="text-sm text-neutral-500 dark:text-neutral-400">min</span>
        </div>
      </div>

      <!-- Servings -->
      <div class="flex items-center gap-2">
        <div class="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-neutral-700 rounded-lg shadow-sm">
          <UIcon
            name="i-heroicons-users"
            class="w-4 h-4 text-neutral-500 dark:text-neutral-400"
          />
          <span class="text-sm text-neutral-500 dark:text-neutral-400">Servings:</span>
          <input
            v-model.number="localServings"
            type="number"
            min="1"
            placeholder="4"
            class="w-12 text-sm font-medium text-neutral-700 dark:text-neutral-200 bg-transparent border-none outline-none text-center focus:ring-0"
          >
        </div>
      </div>

      <!-- Visibility Toggle -->
      <div class="flex items-center gap-2 ml-auto">
        <div class="flex items-center gap-2 px-3 py-2 bg-white dark:bg-neutral-700 rounded-lg shadow-sm">
          <UIcon
            :name="localIsPublished ? 'i-heroicons-globe-alt' : 'i-heroicons-lock-closed'"
            class="w-4 h-4"
            :class="localIsPublished ? 'text-sage-500' : 'text-warning-500'"
          />
          <span class="text-sm text-neutral-600 dark:text-neutral-300">
            {{ localIsPublished ? 'Public' : 'Private' }}
          </span>
          <USwitch
            v-model="localIsPublished"
            size="sm"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"] {
  -moz-appearance: textfield;
}
</style>
