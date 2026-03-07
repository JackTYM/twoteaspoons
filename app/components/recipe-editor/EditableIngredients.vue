<script setup lang="ts">
import draggable from 'vuedraggable'

interface IngredientInput {
  id: string
  amount: string
  unit: string
  item: string
  notes: string
}

interface Props {
  ingredients: IngredientInput[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:ingredients': [ingredients: IngredientInput[]]
  add: []
  update: [index: number, ingredient: IngredientInput]
  remove: [index: number]
}>()

// Local reactive copy for draggable
const localIngredients = computed({
  get: () => props.ingredients,
  set: (value) => emit('update:ingredients', value),
})

// Quick unit options (shown as buttons - only most common)
const quickUnits = ['tsp', 'tbsp']

// Extra units (shown in dropdown)
const extraUnits = [
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

function updateField(index: number, field: keyof IngredientInput, value: string): void {
  const ingredient = props.ingredients[index]
  if (!ingredient) return
  emit('update', index, {
    ...ingredient,
    [field]: value,
  })
}

function toggleUnit(index: number, unit: string): void {
  const ingredient = props.ingredients[index]
  if (!ingredient) return
  emit('update', index, {
    ...ingredient,
    unit: ingredient.unit === unit ? '' : unit,
  })
}

// Expand collapsed state
const showNotes = ref<Set<string>>(new Set())

function toggleNotes(id: string): void {
  if (showNotes.value.has(id)) {
    showNotes.value.delete(id)
  } else {
    showNotes.value.add(id)
  }
}
</script>

<template>
  <UCard class="bg-neutral-50 dark:bg-neutral-800 sticky top-24">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
            <UIcon
              name="i-heroicons-list-bullet"
              class="w-5 h-5 text-primary-600 dark:text-primary-400"
            />
          </span>
          <div>
            <h2 class="text-lg font-display text-neutral-700 dark:text-neutral-100">
              Ingredients
            </h2>
            <p class="text-sm text-neutral-500 dark:text-neutral-400">
              {{ ingredients.filter(i => i.item.trim()).length }} items
            </p>
          </div>
        </div>
        <UButton
          type="button"
          color="primary"
          variant="soft"
          size="sm"
          icon="i-heroicons-plus"
          @click="emit('add')"
        >
          Add
        </UButton>
      </div>
    </template>

    <!-- Ingredient List -->
    <div class="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto pr-1">
      <draggable
        v-model="localIngredients"
        item-key="id"
        handle=".drag-handle"
        :animation="200"
        ghost-class="opacity-30"
        drag-class="shadow-lg"
      >
        <template #item="{ element, index }">
          <div
            class="group p-3 bg-white dark:bg-neutral-700 rounded-lg border border-neutral-200 dark:border-neutral-600 hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
          >
            <!-- Row 1: Amount & Unit -->
            <div class="flex items-center gap-1.5 mb-2">
              <!-- Drag Handle -->
              <div class="drag-handle cursor-grab active:cursor-grabbing text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 flex-shrink-0">
                <UIcon
                  name="i-heroicons-bars-3"
                  class="w-4 h-4"
                />
              </div>

              <!-- Amount -->
              <input
                :value="element.amount"
                type="text"
                placeholder="1"
                class="w-10 px-1 py-1 text-sm text-center bg-neutral-50 dark:bg-neutral-600 rounded border-0 focus:ring-2 focus:ring-primary-500 flex-shrink-0"
                @input="updateField(index, 'amount', ($event.target as HTMLInputElement).value)"
              >

              <!-- Quick Unit Buttons -->
              <div class="flex gap-0.5 flex-shrink-0">
                <button
                  v-for="unit in quickUnits"
                  :key="unit"
                  type="button"
                  class="w-8 py-1 text-xs font-medium rounded transition-colors text-center"
                  :class="[
                    element.unit === unit
                      ? 'bg-primary-500 text-white'
                      : 'bg-neutral-100 dark:bg-neutral-600 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-500'
                  ]"
                  @click="toggleUnit(index, unit)"
                >
                  {{ unit }}
                </button>
              </div>

              <!-- More Units Dropdown -->
              <USelect
                :model-value="extraUnits.includes(element.unit) ? element.unit : undefined"
                :items="extraUnits"
                placeholder="+"
                size="xs"
                class="w-16 flex-shrink-0"
                @update:model-value="updateField(index, 'unit', String($event || ''))"
              />

              <div class="flex-1" />

              <!-- Notes Toggle -->
              <UButton
                type="button"
                color="neutral"
                variant="ghost"
                size="xs"
                :icon="showNotes.has(element.id) ? 'i-heroicons-chevron-up' : 'i-heroicons-chat-bubble-bottom-center-text'"
                class="opacity-50 hover:opacity-100 flex-shrink-0"
                :aria-label="showNotes.has(element.id) ? 'Hide notes' : 'Add notes'"
                :aria-expanded="showNotes.has(element.id)"
                @click="toggleNotes(element.id)"
              />

              <!-- Delete Button -->
              <UButton
                type="button"
                color="error"
                variant="ghost"
                size="xs"
                icon="i-heroicons-trash"
                class="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                :disabled="ingredients.length <= 1"
                aria-label="Delete ingredient"
                @click="emit('remove', index)"
              />
            </div>

            <!-- Row 2: Ingredient Name -->
            <div class="pl-6">
              <input
                :value="element.item"
                type="text"
                placeholder="Ingredient name..."
                class="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-600 rounded border-0 focus:ring-2 focus:ring-primary-500"
                @input="updateField(index, 'item', ($event.target as HTMLInputElement).value)"
              >
            </div>

            <!-- Notes (Expandable) -->
            <Transition
              enter-active-class="transition-all duration-200 ease-out"
              enter-from-class="opacity-0 max-h-0"
              enter-to-class="opacity-100 max-h-20"
              leave-active-class="transition-all duration-200 ease-in"
              leave-from-class="opacity-100 max-h-20"
              leave-to-class="opacity-0 max-h-0"
            >
              <div
                v-if="showNotes.has(element.id)"
                class="mt-2 pl-6 overflow-hidden"
              >
                <input
                  :value="element.notes"
                  type="text"
                  placeholder="Add notes (e.g., room temperature, finely chopped)..."
                  class="w-full px-2 py-1 text-xs bg-neutral-50 dark:bg-neutral-600 rounded border-0 focus:ring-2 focus:ring-primary-500"
                  @input="updateField(index, 'notes', ($event.target as HTMLInputElement).value)"
                >
              </div>
            </Transition>
          </div>
        </template>
      </draggable>
    </div>

    <template #footer>
      <p class="text-xs text-neutral-500 dark:text-neutral-400 text-center">
        Drag to reorder ingredients
      </p>
    </template>
  </UCard>
</template>
