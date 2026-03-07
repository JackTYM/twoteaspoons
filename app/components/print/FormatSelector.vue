<script setup lang="ts">
interface FormatDimension {
  width: string
  height: string
  name: string
}

interface Props {
  formats: Record<string, FormatDimension>
  selectedFormat: string
}

defineProps<Props>()

const emit = defineEmits<{
  select: [format: string]
}>()

// Get preview size for visual comparison (scaled down)
function getPreviewSize(format: FormatDimension): { width: string; height: string } {
  const baseScale = 12 // pixels per inch at preview size
  const width = parseFloat(format.width) * baseScale
  const height = parseFloat(format.height) * baseScale
  return {
    width: `${width}px`,
    height: `${height}px`,
  }
}

// Format icons
const formatIcons: Record<string, string> = {
  '3x5': 'i-heroicons-credit-card',
  '4x6': 'i-heroicons-photo',
  'a6': 'i-heroicons-document',
  'half-letter': 'i-heroicons-document-text',
  'full': 'i-heroicons-newspaper',
}
</script>

<template>
  <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
    <button
      v-for="(format, key) in formats"
      :key="key"
      class="group relative p-4 rounded-xl border-2 transition-all text-left hover-lift"
      :class="[
        selectedFormat === key
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
          : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-neutral-800'
      ]"
      @click="emit('select', key)"
    >
      <!-- Format preview visualization -->
      <div class="flex justify-center mb-3">
        <div
          class="border-2 rounded bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center transition-colors"
          :class="[
            selectedFormat === key
              ? 'border-primary-300 dark:border-primary-700'
              : 'border-neutral-200 dark:border-neutral-700'
          ]"
          :style="getPreviewSize(format)"
        >
          <UIcon
            :name="formatIcons[key] || 'i-heroicons-document'"
            class="w-4 h-4"
            :class="[
              selectedFormat === key
                ? 'text-primary-500'
                : 'text-neutral-400'
            ]"
          />
        </div>
      </div>

      <!-- Format name -->
      <p
        class="font-medium text-sm text-center transition-colors"
        :class="[
          selectedFormat === key
            ? 'text-primary-700 dark:text-primary-300'
            : 'text-neutral-700 dark:text-neutral-100'
        ]"
      >
        {{ format.name }}
      </p>

      <!-- Selected checkmark -->
      <Transition name="check">
        <div
          v-if="selectedFormat === key"
          class="absolute top-2 right-2 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center"
        >
          <UIcon
            name="i-heroicons-check"
            class="w-3 h-3 text-white"
          />
        </div>
      </Transition>
    </button>
  </div>
</template>

<style scoped>
.check-enter-active,
.check-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.check-enter-from,
.check-leave-to {
  transform: scale(0);
  opacity: 0;
}
</style>
