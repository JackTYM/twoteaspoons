<script setup lang="ts">
import { getSectionConfig, getSectionIcon } from './types'

interface Props {
  availableSections: string[]
  disabled?: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  addSection: [section: string]
}>()

const showDropdown = ref(false)
</script>

<template>
  <div class="relative">
    <button
      type="button"
      class="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl hover:border-primary-400 dark:hover:border-primary-500 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all"
      :disabled="disabled || availableSections.length === 0"
      @click="showDropdown = !showDropdown"
    >
      <UIcon
        name="i-heroicons-plus-circle"
        class="w-5 h-5 text-neutral-400"
      />
      <span class="text-sm font-medium text-neutral-500 dark:text-neutral-400">
        {{ availableSections.length > 0 ? 'Add Section' : 'All sections added' }}
      </span>
    </button>

    <!-- Dropdown -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="showDropdown && availableSections.length > 0"
        class="absolute left-0 right-0 mt-2 bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden z-10"
      >
        <button
          v-for="section in availableSections"
          :key="section"
          type="button"
          class="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors text-left"
          @click="() => { emit('addSection', section); showDropdown = false }"
        >
          <div
            class="w-8 h-8 rounded-lg flex items-center justify-center"
            :class="getSectionConfig(section).bg"
          >
            <UIcon
              :name="getSectionIcon(section)"
              class="w-4 h-4"
              :class="getSectionConfig(section).icon"
            />
          </div>
          <span class="text-sm font-medium text-neutral-700 dark:text-neutral-200">
            {{ getSectionConfig(section).label }}
          </span>
        </button>
      </div>
    </Transition>

    <!-- Backdrop to close dropdown -->
    <div
      v-if="showDropdown"
      class="fixed inset-0 z-0"
      @click="showDropdown = false"
    />
  </div>
</template>
