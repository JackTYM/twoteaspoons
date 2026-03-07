<script setup lang="ts">
import type { AutosaveStatus } from '~/composables/useAutosave'

interface Props {
  activeTab: 'edit' | 'preview'
  autosaveStatus?: AutosaveStatus
  loading?: boolean
  submitLabel?: string
}

withDefaults(defineProps<Props>(), {
  autosaveStatus: 'idle',
  loading: false,
  submitLabel: 'Save List',
})

const emit = defineEmits<{
  'update:activeTab': [tab: 'edit' | 'preview']
  save: []
  cancel: []
}>()

const tabs = [
  { key: 'edit' as const, label: 'Edit', icon: 'i-heroicons-pencil-square' },
  { key: 'preview' as const, label: 'Preview', icon: 'i-heroicons-eye' },
]

function setTab(tab: 'edit' | 'preview'): void {
  emit('update:activeTab', tab)
}

const statusConfig = {
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
    text: 'Saved',
    class: 'text-success-500',
  },
  error: {
    icon: 'i-heroicons-exclamation-circle',
    text: 'Save failed',
    class: 'text-error-500',
  },
}
</script>

<template>
  <div class="sticky top-0 z-30 -mx-4 px-4 sm:-mx-6 sm:px-6 py-4 glass border-b border-neutral-200 dark:border-neutral-700">
    <div class="flex items-center justify-between gap-4">
      <!-- Back Button -->
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-heroicons-arrow-left"
        class="shrink-0"
        @click="emit('cancel')"
      >
        <span class="hidden sm:inline">Back</span>
      </UButton>

      <!-- Tab Switcher (Center) -->
      <div class="flex-1 flex justify-center">
        <div class="inline-flex items-center p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            type="button"
            class="relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2"
            :class="[
              activeTab === tab.key
                ? 'bg-white dark:bg-neutral-700 text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            ]"
            @click="setTab(tab.key)"
          >
            <UIcon
              :name="tab.icon"
              class="w-4 h-4"
            />
            <span>{{ tab.label }}</span>
          </button>
        </div>
      </div>

      <!-- Right Side: Autosave + Save Button -->
      <div class="flex items-center gap-3 shrink-0">
        <!-- Autosave Status -->
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
            class="hidden sm:flex items-center gap-1.5 text-sm"
            :class="statusConfig[autosaveStatus].class"
          >
            <UIcon
              :name="statusConfig[autosaveStatus].icon"
              class="w-4 h-4"
            />
            <span v-if="statusConfig[autosaveStatus].text">
              {{ statusConfig[autosaveStatus].text }}
            </span>
          </div>
        </Transition>

        <!-- Save Button -->
        <UButton
          color="primary"
          :loading="loading"
          class="press-effect"
          @click="emit('save')"
        >
          {{ submitLabel }}
        </UButton>
      </div>
    </div>
  </div>
</template>
