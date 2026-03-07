<script setup lang="ts">
import type { ShoppingItem } from './types'

interface Props {
  item: ShoppingItem
  disabled?: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  update: [field: keyof ShoppingItem, value: string | boolean]
  delete: []
  toggle: []
}>()

// Quick unit options - use 'none' as placeholder since Reka Select rejects empty strings
const UNIT_NONE = '_none_'
const quickUnits = [
  { label: '—', value: UNIT_NONE },
  { label: 'cup', value: 'cup' },
  { label: 'tbsp', value: 'tbsp' },
  { label: 'tsp', value: 'tsp' },
  { label: 'oz', value: 'oz' },
  { label: 'lb', value: 'lb' },
]

// Convert stored value to select value (empty/null -> UNIT_NONE)
function toSelectValue(unit: string | null | undefined): string {
  return unit || UNIT_NONE
}

// Convert select value to stored value (UNIT_NONE -> empty string)
function fromSelectValue(value: string): string {
  return value === UNIT_NONE ? '' : value
}
</script>

<template>
  <div
    class="group flex items-center gap-2 p-3 bg-white dark:bg-neutral-700 rounded-lg border border-neutral-200 dark:border-neutral-600 hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
    :class="{ 'opacity-60': item.checked }"
  >
    <!-- Drag Handle -->
    <div class="drag-handle cursor-grab active:cursor-grabbing text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 flex-shrink-0">
      <UIcon
        name="i-heroicons-bars-3"
        class="w-4 h-4"
      />
    </div>

    <!-- Checkbox -->
    <button
      type="button"
      class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
      :class="item.checked
        ? 'bg-sage-500 border-2 border-sage-500'
        : 'border-2 border-neutral-300 dark:border-neutral-600 hover:border-primary-400'"
      :disabled="disabled"
      @click="emit('toggle')"
    >
      <UIcon
        v-if="item.checked"
        name="i-heroicons-check"
        class="w-4 h-4 text-white"
      />
    </button>

    <!-- Amount Input -->
    <input
      :value="item.amount || ''"
      type="text"
      placeholder="Qty"
      class="w-12 px-2 py-1 text-sm text-center bg-neutral-50 dark:bg-neutral-600 rounded border-0 focus:ring-2 focus:ring-primary-500 flex-shrink-0"
      :disabled="disabled"
      @input="emit('update', 'amount', ($event.target as HTMLInputElement).value)"
    >

    <!-- Unit Select -->
    <USelect
      :model-value="toSelectValue(item.unit)"
      :items="quickUnits"
      value-key="value"
      size="xs"
      class="w-16 flex-shrink-0"
      :disabled="disabled"
      @update:model-value="emit('update', 'unit', fromSelectValue(String($event)))"
    />

    <!-- Item Name -->
    <input
      :value="item.item"
      type="text"
      placeholder="Item name..."
      class="flex-1 px-2 py-1 text-sm bg-neutral-50 dark:bg-neutral-600 rounded border-0 focus:ring-2 focus:ring-primary-500"
      :class="{ 'line-through text-neutral-400': item.checked }"
      :disabled="disabled"
      @input="emit('update', 'item', ($event.target as HTMLInputElement).value)"
    >

    <!-- Delete Button -->
    <UButton
      type="button"
      color="error"
      variant="ghost"
      size="xs"
      icon="i-heroicons-trash"
      class="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
      :disabled="disabled"
      aria-label="Delete item"
      @click="emit('delete')"
    />
  </div>
</template>
