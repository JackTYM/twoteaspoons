<script setup lang="ts">
interface Ingredient {
  id: number
  amount: string | null
  unit: string | null
  item: string
  notes: string | null
}

interface Props {
  ingredients: Ingredient[]
  scale: number
  open: boolean
  currentStepIngredientIds?: number[] // Ingredient indices for current step
}

const props = withDefaults(defineProps<Props>(), {
  currentStepIngredientIds: () => [],
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  'update:scale': [value: number]
}>()

// Track checked ingredients locally
const checkedIngredients = ref<Set<number>>(new Set())

function toggleIngredient(id: number): void {
  if (checkedIngredients.value.has(id)) {
    checkedIngredients.value.delete(id)
  } else {
    checkedIngredients.value.add(id)
  }
}

function isChecked(id: number): boolean {
  return checkedIngredients.value.has(id)
}

function scaledAmount(amount: string | null): string {
  if (!amount) return ''
  const num = parseFloat(amount)
  if (isNaN(num)) return amount
  const scaled = num * props.scale
  if (scaled === Math.floor(scaled)) return String(scaled)
  if (scaled < 1) return scaled.toFixed(2).replace(/\.?0+$/, '')
  return scaled.toFixed(1).replace(/\.?0+$/, '')
}

const scaleOptions = [0.5, 1, 2, 3]

// Check if ingredient is linked to current step
function isLinkedToCurrentStep(index: number): boolean {
  return props.currentStepIngredientIds.includes(index)
}

// Sort ingredients: current step first, then unchecked, then checked
const sortedIngredients = computed(() => {
  return [...props.ingredients].map((ing, index) => ({ ...ing, index })).sort((a, b) => {
    // Current step ingredients first
    const aLinked = isLinkedToCurrentStep(a.index) ? 0 : 1
    const bLinked = isLinkedToCurrentStep(b.index) ? 0 : 1
    if (aLinked !== bLinked) return aLinked - bLinked

    // Then unchecked
    const aChecked = isChecked(a.id) ? 1 : 0
    const bChecked = isChecked(b.id) ? 1 : 0
    return aChecked - bChecked
  })
})

const checkedCount = computed(() => checkedIngredients.value.size)
const currentStepCount = computed(() => props.currentStepIngredientIds.length)
</script>

<template>
  <Transition name="sidebar">
    <aside
      v-if="open"
      class="fixed inset-0 sm:relative sm:inset-auto sm:w-80 border-l border-neutral-700/50 flex flex-col bg-neutral-900 sm:bg-neutral-800/80 backdrop-blur-sm z-50 sm:z-auto"
    >
      <!-- Header -->
      <div class="p-4 sm:p-4 border-b border-neutral-700/50">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-semibold text-lg sm:text-base text-neutral-100">Ingredients</h2>
          <UButton
            size="sm"
            color="neutral"
            variant="ghost"
            icon="i-heroicons-x-mark"
            class="sm:size-xs"
            @click="emit('update:open', false)"
          />
        </div>

        <!-- Scale controls -->
        <div class="flex items-center gap-1">
          <span class="text-xs text-neutral-400 mr-2">Scale:</span>
          <UButton
            v-for="s in scaleOptions"
            :key="s"
            size="xs"
            :color="scale === s ? 'primary' : 'neutral'"
            :variant="scale === s ? 'solid' : 'ghost'"
            class="min-w-[36px]"
            @click="emit('update:scale', s)"
          >
            {{ s === 0.5 ? '½' : s }}x
          </UButton>
        </div>

        <!-- Progress -->
        <div class="mt-3 flex items-center gap-2 text-xs text-neutral-400">
          <div class="flex-1 h-1.5 bg-neutral-700 rounded-full overflow-hidden">
            <div
              class="h-full bg-success-500 transition-all duration-300"
              :style="{ width: `${(checkedCount / ingredients.length) * 100}%` }"
            />
          </div>
          <span>{{ checkedCount }}/{{ ingredients.length }}</span>
        </div>

        <!-- Current step indicator -->
        <div
          v-if="currentStepCount > 0"
          class="mt-3 text-xs text-primary-400 flex items-center gap-1"
        >
          <UIcon
            name="i-heroicons-arrow-right"
            class="w-3 h-3"
          />
          {{ currentStepCount }} ingredient{{ currentStepCount === 1 ? '' : 's' }} for this step
        </div>
      </div>

      <!-- Ingredients list -->
      <div class="flex-1 overflow-y-auto p-4">
        <TransitionGroup
          name="ingredient"
          tag="ul"
          class="space-y-2"
        >
          <li
            v-for="ingredient in sortedIngredients"
            :key="ingredient.id"
            class="flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-all"
            :class="[
              isLinkedToCurrentStep(ingredient.index) && !isChecked(ingredient.id)
                ? 'bg-primary-900/40 border border-primary-700/50 shadow-sm shadow-primary-500/10'
                : isChecked(ingredient.id)
                  ? 'bg-neutral-700/30'
                  : 'hover:bg-neutral-700/50'
            ]"
            @click="toggleIngredient(ingredient.id)"
          >
            <!-- Checkbox -->
            <div
              class="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
              :class="[
                isChecked(ingredient.id)
                  ? 'bg-success-500 border-success-500'
                  : 'border-neutral-500'
              ]"
            >
              <Transition name="check">
                <UIcon
                  v-if="isChecked(ingredient.id)"
                  name="i-heroicons-check"
                  class="w-3 h-3 text-white"
                />
              </Transition>
            </div>

            <!-- Content -->
            <div
              class="flex-1 transition-all"
              :class="{ 'opacity-50': isChecked(ingredient.id) }"
            >
              <div class="flex items-baseline gap-2">
                <span
                  class="font-medium text-primary-400"
                  :class="{ 'line-through': isChecked(ingredient.id) }"
                >
                  {{ scaledAmount(ingredient.amount) }} {{ ingredient.unit }}
                </span>
                <span
                  class="text-neutral-200"
                  :class="{ 'line-through': isChecked(ingredient.id) }"
                >
                  {{ ingredient.item }}
                </span>
              </div>
              <p
                v-if="ingredient.notes"
                class="text-xs text-neutral-400 mt-0.5"
              >
                {{ ingredient.notes }}
              </p>
            </div>
          </li>
        </TransitionGroup>
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
.sidebar-enter-active,
.sidebar-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.sidebar-enter-from,
.sidebar-leave-to {
  opacity: 0;
}

/* Mobile: fade in */
@media (max-width: 639px) {
  .sidebar-enter-from,
  .sidebar-leave-to {
    transform: translateY(20px);
  }
}

/* Desktop: slide from right */
@media (min-width: 640px) {
  .sidebar-enter-from,
  .sidebar-leave-to {
    transform: translateX(100%);
  }
}

.ingredient-move,
.ingredient-enter-active,
.ingredient-leave-active {
  transition: all 0.3s ease;
}

.ingredient-enter-from,
.ingredient-leave-to {
  opacity: 0;
  transform: translateX(10px);
}

.check-enter-active,
.check-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.check-enter-from,
.check-leave-to {
  transform: scale(0);
  opacity: 0;
}
</style>
