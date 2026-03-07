<script setup lang="ts">
import type { AutosaveStatus } from '~/composables/useAutosave'

interface Props {
  loading?: boolean
  autosaveStatus?: AutosaveStatus
  submitLabel?: string
  showProgress?: boolean
  progress?: number
}

withDefaults(defineProps<Props>(), {
  loading: false,
  autosaveStatus: 'idle',
  submitLabel: 'Save Recipe',
  showProgress: false,
  progress: 0,
})

const emit = defineEmits<{
  cancel: []
  submit: []
}>()

// Autosave status display config
const statusConfig = computed(() => ({
  idle: {
    icon: 'i-heroicons-cloud',
    text: '',
    class: 'text-neutral-400',
  },
  saving: {
    icon: 'i-heroicons-cloud-arrow-up',
    text: 'Saving...',
    class: 'text-neutral-500 animate-pulse',
  },
  saved: {
    icon: 'i-heroicons-check-circle',
    text: 'Draft saved',
    class: 'text-success-500',
  },
  error: {
    icon: 'i-heroicons-exclamation-circle',
    text: 'Save failed',
    class: 'text-error-500',
  },
}))
</script>

<template>
  <div
    class="fixed bottom-0 left-0 right-0 z-[60] glass border-t border-neutral-200 dark:border-neutral-700"
  >
    <div class="max-w-4xl mx-auto px-4 py-3 sm:px-6">
      <div class="flex items-center justify-between gap-4">
        <!-- Autosave status (left) -->
        <div class="flex items-center gap-2 text-sm min-w-0">
          <Transition
            mode="out-in"
            enter-active-class="transition-all duration-200"
            enter-from-class="opacity-0 scale-90"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition-all duration-200"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-90"
          >
            <div
              :key="autosaveStatus"
              class="flex items-center gap-1.5"
              :class="statusConfig[autosaveStatus].class"
            >
              <UIcon
                :name="statusConfig[autosaveStatus].icon"
                class="w-4 h-4 shrink-0"
              />
              <span
                v-if="statusConfig[autosaveStatus].text"
                class="hidden sm:inline"
              >
                {{ statusConfig[autosaveStatus].text }}
              </span>
            </div>
          </Transition>
        </div>

        <!-- Progress bar (center) - optional -->
        <div
          v-if="showProgress"
          class="hidden sm:flex flex-1 max-w-xs items-center gap-2"
        >
          <div class="flex-1 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div
              class="h-full bg-primary-500 transition-all duration-300 rounded-full"
              :style="{ width: `${progress}%` }"
            />
          </div>
          <span class="text-xs text-neutral-500 dark:text-neutral-400 w-10 text-right">
            {{ progress }}%
          </span>
        </div>

        <!-- Actions (right) -->
        <div class="flex items-center gap-2 sm:gap-3 shrink-0">
          <UButton
            type="button"
            color="neutral"
            variant="ghost"
            size="sm"
            class="hidden sm:inline-flex"
            @click="emit('cancel')"
          >
            Cancel
          </UButton>
          <UButton
            type="button"
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-heroicons-x-mark"
            class="sm:hidden"
            @click="emit('cancel')"
          />
          <UButton
            type="submit"
            color="primary"
            size="sm"
            :loading="loading"
            class="press-effect"
            @click="emit('submit')"
          >
            {{ submitLabel }}
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
