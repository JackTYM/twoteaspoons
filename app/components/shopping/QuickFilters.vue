<script setup lang="ts">
interface Props {
  totalCount: number
  selectedCount: number
  visibleCount: number
}

defineProps<Props>()

const emit = defineEmits<{
  selectAllVisible: []
  clearAll: []
}>()

const searchQuery = defineModel<string>('search', { default: '' })

</script>

<template>
  <div class="space-y-4">
    <!-- Search -->
    <div class="relative">
      <UIcon
        name="i-heroicons-magnifying-glass"
        class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400"
      />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search recipes..."
        class="w-full pl-10 pr-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 border-0 rounded-xl text-neutral-700 dark:text-neutral-200 placeholder-neutral-400 focus:ring-2 focus:ring-primary-500 transition-all"
      >
      <button
        v-if="searchQuery"
        type="button"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
        @click="searchQuery = ''"
      >
        <UIcon
          name="i-heroicons-x-mark"
          class="w-5 h-5"
        />
      </button>
    </div>

    <!-- Quick Actions -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="text-sm text-neutral-500 dark:text-neutral-400">
        Showing {{ visibleCount }} of {{ totalCount }} recipes
      </div>

      <div class="flex items-center gap-2">
        <UButton
          v-if="visibleCount > 0 && selectedCount < visibleCount"
          variant="ghost"
          color="neutral"
          size="sm"
          icon="i-heroicons-check-circle"
          @click="emit('selectAllVisible')"
        >
          Select all
        </UButton>
        <UButton
          v-if="selectedCount > 0"
          variant="ghost"
          color="neutral"
          size="sm"
          icon="i-heroicons-x-circle"
          @click="emit('clearAll')"
        >
          Clear ({{ selectedCount }})
        </UButton>
      </div>
    </div>
  </div>
</template>
