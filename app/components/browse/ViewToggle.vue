<script setup lang="ts">
type ViewMode = 'grid' | 'list'

const model = defineModel<ViewMode>({ default: 'grid' })
</script>

<template>
  <div class="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
    <button
      type="button"
      class="p-2 rounded-md transition-all duration-150"
      :class="[
        model === 'grid'
          ? 'bg-white dark:bg-neutral-700 text-primary-600 dark:text-primary-400 shadow-sm'
          : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
      ]"
      title="Grid view"
      @click="model = 'grid'"
    >
      <UIcon
        name="i-heroicons-squares-2x2"
        class="w-5 h-5"
      />
    </button>
    <button
      type="button"
      class="p-2 rounded-md transition-all duration-150"
      :class="[
        model === 'list'
          ? 'bg-white dark:bg-neutral-700 text-primary-600 dark:text-primary-400 shadow-sm'
          : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
      ]"
      title="List view"
      @click="model = 'list'"
    >
      <UIcon
        name="i-heroicons-bars-3"
        class="w-5 h-5"
      />
    </button>
  </div>
</template>
