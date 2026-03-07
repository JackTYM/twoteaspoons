<script setup lang="ts">
interface Filter {
  key: string
  label: string
  value: string
}

interface Props {
  filters: Filter[]
}

defineProps<Props>()

const emit = defineEmits<{
  remove: [key: string]
  clearAll: []
}>()
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-200"
    leave-active-class="transition-all duration-200"
    enter-from-class="opacity-0 -translate-y-2"
    leave-to-class="opacity-0 -translate-y-2"
  >
    <div
      v-if="filters.length > 0"
      class="flex flex-wrap items-center gap-2"
    >
      <TransitionGroup
        enter-active-class="transition-all duration-150"
        leave-active-class="transition-all duration-150"
        enter-from-class="opacity-0 scale-90"
        leave-to-class="opacity-0 scale-90"
      >
        <button
          v-for="filter in filters"
          :key="filter.key"
          type="button"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 rounded-full text-sm font-medium hover:bg-primary-200 dark:hover:bg-primary-800/50 transition-colors group"
          @click="emit('remove', filter.key)"
        >
          <span>{{ filter.label }}: {{ filter.value }}</span>
          <UIcon
            name="i-heroicons-x-mark"
            class="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity"
          />
        </button>
      </TransitionGroup>

      <button
        v-if="filters.length > 1"
        type="button"
        class="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 underline-offset-2 hover:underline transition-colors"
        @click="emit('clearAll')"
      >
        Clear all
      </button>
    </div>
  </Transition>
</template>
