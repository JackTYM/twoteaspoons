<script setup lang="ts">
interface Ingredient {
  id: string
  amount: string
  unit: string
  item: string
  notes: string
}

interface Props {
  ingredient: Ingredient
  canDelete: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  update: [ingredient: Ingredient]
  delete: []
}>()

// Quick unit options
const quickUnits = ['tsp', 'tbsp', 'cup', 'oz']

// All available units
const unitOptions = [
  'tsp',
  'tbsp',
  'cup',
  'oz',
  'lb',
  'g',
  'kg',
  'ml',
  'L',
  'piece',
  'slice',
  'clove',
  'can',
  'bunch',
  'pinch',
]

function updateField(field: keyof Ingredient, value: string): void {
  emit('update', {
    ...props.ingredient,
    [field]: value,
  })
}

function toggleUnit(unit: string): void {
  emit('update', {
    ...props.ingredient,
    unit: props.ingredient.unit === unit ? '' : unit,
  })
}
</script>

<template>
  <div class="draggable-row group flex gap-2 items-start p-2 -mx-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors">
    <!-- Drag handle -->
    <div class="drag-handle flex items-center justify-center w-8 h-9 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 shrink-0">
      <UIcon
        name="i-heroicons-bars-3"
        class="w-5 h-5"
      />
    </div>

    <!-- Amount input -->
    <UInput
      :model-value="ingredient.amount"
      placeholder="1"
      class="w-16 sm:w-20"
      @update:model-value="updateField('amount', String($event))"
    />

    <!-- Quick unit buttons (desktop) -->
    <div class="hidden sm:flex gap-1">
      <button
        v-for="unit in quickUnits"
        :key="unit"
        type="button"
        class="px-2 py-1.5 text-xs font-medium rounded-md transition-colors"
        :class="[
          ingredient.unit === unit
            ? 'bg-primary-500 text-white'
            : 'bg-neutral-200 dark:bg-neutral-600 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-500'
        ]"
        @click="toggleUnit(unit)"
      >
        {{ unit }}
      </button>
    </div>

    <!-- Unit dropdown (mobile and other units) -->
    <USelect
      :model-value="ingredient.unit"
      :items="unitOptions"
      placeholder="unit"
      class="w-20 sm:w-24"
      @update:model-value="updateField('unit', String($event || ''))"
    />

    <!-- Item input -->
    <UInput
      :model-value="ingredient.item"
      placeholder="Ingredient name"
      class="flex-1 min-w-0"
      @update:model-value="updateField('item', String($event))"
    />

    <!-- Notes input (hidden on mobile) -->
    <UInput
      :model-value="ingredient.notes"
      placeholder="notes"
      class="w-28 hidden md:block"
      @update:model-value="updateField('notes', String($event))"
    />

    <!-- Delete button -->
    <UButton
      type="button"
      color="error"
      variant="ghost"
      icon="i-heroicons-trash"
      size="sm"
      class="delete-btn shrink-0"
      :disabled="!canDelete"
      aria-label="Delete ingredient"
      @click="emit('delete')"
    />
  </div>
</template>
