<script setup lang="ts">
import { useIngredientDetection } from '~/composables/useIngredientDetection'

interface IngredientInput {
  id: string
  amount: string
  unit: string
  item: string
  notes: string
}

interface IngredientLink {
  id: number
  amount?: string | null
  unit?: string | null
}

interface Props {
  instructionContent: string
  ingredients: IngredientInput[]
  selectedIngredientLinks: IngredientLink[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:selectedIngredientLinks': [links: IngredientLink[]]
}>()

// Use ingredient detection composable
const { detectIngredients } = useIngredientDetection()

// Common units for dropdown
const commonUnits = ['', 'tsp', 'tbsp', 'cup', 'oz', 'lb', 'g', 'ml', 'piece', 'clove', 'sprig']

// Detected ingredients from the instruction text
const detectedMatches = computed(() => {
  if (!props.instructionContent.trim()) return []
  return detectIngredients(
    props.instructionContent,
    props.ingredients.map((i, index) => ({
      id: index,
      item: i.item,
      amount: i.amount,
      unit: i.unit,
    }))
  )
})

// Get linked ingredient IDs
const linkedIds = computed(() => props.selectedIngredientLinks.map((l) => l.id))

// Suggested (detected but not yet linked) - deduplicated by ingredient ID
const suggestedIngredients = computed(() => {
  const ids = detectedMatches.value
    .filter((match) => !linkedIds.value.includes(match.ingredientId))
    .map((match) => match.ingredientId)
  return [...new Set(ids)]
})

// Find link for a given ingredient index
function getLink(index: number): IngredientLink | undefined {
  return props.selectedIngredientLinks.find((l) => l.id === index)
}

// Toggle an ingredient selection
function toggleIngredient(index: number): void {
  const links = [...props.selectedIngredientLinks]
  const existingIdx = links.findIndex((l) => l.id === index)

  if (existingIdx >= 0) {
    // Remove the link
    links.splice(existingIdx, 1)
  } else {
    // Add new link (without partial amount by default)
    links.push({ id: index })
  }

  emit('update:selectedIngredientLinks', links)
}

// Update partial amount for a linked ingredient
function updatePartialAmount(index: number, amount: string): void {
  const links = [...props.selectedIngredientLinks]
  const existingIdx = links.findIndex((l) => l.id === index)
  const existingLink = links[existingIdx]

  if (existingIdx >= 0 && existingLink) {
    const ingredient = props.ingredients[index]
    links[existingIdx] = {
      id: existingLink.id,
      amount: amount || null,
      // Default unit to ingredient's unit if not set
      unit: existingLink.unit ?? ingredient?.unit ?? null,
    }
    emit('update:selectedIngredientLinks', links)
  }
}

// Update unit for a linked ingredient
function updatePartialUnit(index: number, unit: string): void {
  const links = [...props.selectedIngredientLinks]
  const existingIdx = links.findIndex((l) => l.id === index)
  const existingLink = links[existingIdx]

  if (existingIdx >= 0 && existingLink) {
    links[existingIdx] = {
      id: existingLink.id,
      amount: existingLink.amount,
      unit: unit || null,
    }
    emit('update:selectedIngredientLinks', links)
  }
}

// Add all suggested ingredients
function addAllSuggested(): void {
  const existingIds = new Set(linkedIds.value)
  const newLinks: IngredientLink[] = [
    ...props.selectedIngredientLinks,
    ...suggestedIngredients.value
      .filter((id) => !existingIds.has(id))
      .map((id) => ({ id })),
  ]
  emit('update:selectedIngredientLinks', newLinks)
}

// Format ingredient display
function formatIngredient(ingredient: IngredientInput): string {
  const parts = []
  if (ingredient.amount) parts.push(ingredient.amount)
  if (ingredient.unit) parts.push(ingredient.unit)
  parts.push(ingredient.item)
  return parts.join(' ')
}

// Get ingredients with their original indices (for proper selection tracking)
const ingredientsWithOriginalIndex = computed(() => {
  return props.ingredients
    .map((ingredient, originalIndex) => ({ ingredient, originalIndex }))
    .filter(({ ingredient }) => ingredient.item.trim())
})
</script>

<template>
  <div class="ingredient-linker">
    <div class="flex items-center gap-2 mb-2">
      <UIcon
        name="i-heroicons-link"
        class="w-4 h-4 text-neutral-500"
      />
      <span class="text-sm font-medium text-neutral-600 dark:text-neutral-400">
        Link ingredients used in this step
      </span>
    </div>

    <!-- AI Suggestions Banner -->
    <div
      v-if="suggestedIngredients.length > 0"
      class="mb-3 p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg"
    >
      <div class="flex items-center justify-between gap-2 mb-2">
        <div class="flex items-center gap-1.5 text-xs text-primary-700 dark:text-primary-300">
          <UIcon
            name="i-heroicons-sparkles"
            class="w-3.5 h-3.5"
          />
          <span>Detected in text</span>
        </div>
        <UButton
          type="button"
          color="primary"
          variant="ghost"
          size="xs"
          @click="addAllSuggested"
        >
          Add all
        </UButton>
      </div>
      <div class="flex flex-wrap gap-1">
        <button
          v-for="index in suggestedIngredients"
          :key="index"
          type="button"
          class="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white dark:bg-neutral-800 border border-primary-200 dark:border-primary-700 text-primary-700 dark:text-primary-300 rounded-full hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
          @click="toggleIngredient(index)"
        >
          <UIcon
            name="i-heroicons-plus"
            class="w-3 h-3"
          />
          {{ ingredients[index]?.item || `Ingredient ${index + 1}` }}
        </button>
      </div>
    </div>

    <!-- Ingredient Checkboxes -->
    <div class="space-y-2 max-h-64 overflow-y-auto">
      <div
        v-for="{ ingredient, originalIndex } in ingredientsWithOriginalIndex"
        :key="ingredient.id"
        class="rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
      >
        <!-- Checkbox Row -->
        <label
          class="flex items-center gap-2 p-2 cursor-pointer"
        >
          <UCheckbox
            :model-value="linkedIds.includes(originalIndex)"
            size="sm"
            @update:model-value="toggleIngredient(originalIndex)"
          />
          <span
            class="text-sm flex-1"
            :class="[
              linkedIds.includes(originalIndex)
                ? 'text-primary-700 dark:text-primary-300 font-medium'
                : 'text-neutral-600 dark:text-neutral-400'
            ]"
          >
            {{ ingredient.item }}
          </span>
          <span
            v-if="ingredient.amount"
            class="text-xs text-neutral-400 dark:text-neutral-500"
          >
            ({{ formatIngredient(ingredient) }})
          </span>
          <UBadge
            v-if="detectedMatches.some(m => m.ingredientId === originalIndex)"
            color="primary"
            variant="soft"
            size="xs"
          >
            detected
          </UBadge>
        </label>

        <!-- Partial Amount Controls (shown when linked) -->
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 max-h-0"
          enter-to-class="opacity-100 max-h-20"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 max-h-20"
          leave-to-class="opacity-0 max-h-0"
        >
          <div
            v-if="linkedIds.includes(originalIndex)"
            class="pl-8 pb-2 overflow-hidden"
          >
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-xs text-neutral-500 dark:text-neutral-400">Amount:</span>
              <UInput
                :model-value="getLink(originalIndex)?.amount ?? ''"
                type="text"
                placeholder="All"
                size="xs"
                class="w-16"
                @update:model-value="updatePartialAmount(originalIndex, String($event))"
              />
              <USelectMenu
                :model-value="getLink(originalIndex)?.unit ?? ingredient.unit ?? ''"
                :items="commonUnits"
                size="xs"
                class="w-20"
                placeholder="unit"
                @update:model-value="updatePartialUnit(originalIndex, String($event))"
              />
              <span
                v-if="ingredient.amount"
                class="text-xs text-neutral-400 dark:text-neutral-500 italic"
              >
                of {{ ingredient.amount }} {{ ingredient.unit }} total
              </span>
            </div>
            <p class="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
              Leave blank to use full amount
            </p>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="ingredientsWithOriginalIndex.length === 0"
      class="text-center py-4 text-sm text-neutral-500 dark:text-neutral-400"
    >
      Add ingredients first to link them to this step
    </div>
  </div>
</template>
