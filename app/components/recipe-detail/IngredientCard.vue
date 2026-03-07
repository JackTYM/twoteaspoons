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
  servings: number | null
  modelValue?: number
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: 1,
})

const emit = defineEmits<{
  'update:modelValue': [scale: number]
}>()

// Scaling - use v-model or local state
const scale = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})
const scaleOptions = [0.5, 1, 2, 3]
const customScale = ref('')
const showCustomInput = ref(false)

// Track checked ingredients (local state)
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

function clearAllChecked(): void {
  checkedIngredients.value.clear()
}

// Parse fractions like "1/2", "1 1/2", "3/4"
function parseFraction(str: string): number | null {
  const trimmed = str.trim()

  // Try mixed number: "1 1/2"
  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (mixedMatch && mixedMatch[1] && mixedMatch[2] && mixedMatch[3]) {
    const whole = parseInt(mixedMatch[1])
    const numerator = parseInt(mixedMatch[2])
    const denominator = parseInt(mixedMatch[3])
    return whole + numerator / denominator
  }

  // Try simple fraction: "1/2"
  const fractionMatch = trimmed.match(/^(\d+)\/(\d+)$/)
  if (fractionMatch && fractionMatch[1] && fractionMatch[2]) {
    const numerator = parseInt(fractionMatch[1])
    const denominator = parseInt(fractionMatch[2])
    return numerator / denominator
  }

  // Try decimal or integer
  const num = parseFloat(trimmed)
  return isNaN(num) ? null : num
}

// Convert decimal to fraction string for display
function toFractionString(value: number): string {
  if (value === Math.floor(value)) return String(value)

  const whole = Math.floor(value)
  const decimal = value - whole

  // Common fractions
  const fractions: [number, string][] = [
    [0.125, '⅛'], [0.25, '¼'], [0.333, '⅓'], [0.375, '⅜'],
    [0.5, '½'], [0.625, '⅝'], [0.666, '⅔'], [0.75, '¾'], [0.875, '⅞']
  ]

  for (const [frac, symbol] of fractions) {
    if (Math.abs(decimal - frac) < 0.05) {
      return whole > 0 ? `${whole} ${symbol}` : symbol
    }
  }

  // Fallback to decimal
  if (value < 1) return value.toFixed(2).replace(/\.?0+$/, '')
  return value.toFixed(1).replace(/\.?0+$/, '')
}

function scaledAmount(amount: string | null): string {
  if (!amount) return ''
  const num = parseFraction(amount)
  if (num === null) return amount
  const scaled = num * scale.value
  return toFractionString(scaled)
}

function setScale(value: number): void {
  scale.value = value
  showCustomInput.value = false
}

function handleCustomScale(): void {
  const num = parseFloat(customScale.value)
  if (!isNaN(num) && num > 0 && num <= 10) {
    scale.value = num
    showCustomInput.value = false
  }
}

const scaledServings = computed(() => {
  if (!props.servings) return null
  return Math.round(props.servings * scale.value)
})

const checkedCount = computed(() => checkedIngredients.value.size)
const totalCount = computed(() => props.ingredients.length)
</script>

<template>
  <UCard class="bg-neutral-50 dark:bg-neutral-800 sticky top-20">
    <template #header>
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
          <p
            v-if="scaledServings"
            class="text-sm text-neutral-500 dark:text-neutral-400"
          >
            For {{ scaledServings }} serving{{ scaledServings === 1 ? '' : 's' }}
          </p>
        </div>
      </div>
    </template>

    <!-- Scale Controls -->
    <div class="mb-4 pb-4 border-b border-neutral-200 dark:border-neutral-700">
      <p class="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
        Adjust Servings
      </p>
      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="s in scaleOptions"
          :key="s"
          size="sm"
          :color="scale === s && !showCustomInput ? 'primary' : 'neutral'"
          :variant="scale === s && !showCustomInput ? 'solid' : 'outline'"
          class="press-effect"
          @click="setScale(s)"
        >
          {{ s === 1 ? '1x' : s < 1 ? '½x' : `${s}x` }}
        </UButton>

        <!-- Custom Scale -->
        <template v-if="showCustomInput">
          <div class="flex items-center gap-1">
            <UInput
              v-model="customScale"
              type="number"
              step="0.5"
              min="0.25"
              max="10"
              placeholder="2.5"
              class="w-16"
              size="sm"
              @keydown.enter="handleCustomScale"
            />
            <span class="text-sm text-neutral-500">x</span>
            <UButton
              size="xs"
              color="primary"
              @click="handleCustomScale"
            >
              Set
            </UButton>
          </div>
        </template>
        <UButton
          v-else
          size="sm"
          color="neutral"
          variant="ghost"
          @click="showCustomInput = true"
        >
          Custom
        </UButton>
      </div>
    </div>

    <!-- Progress Indicator -->
    <div
      v-if="checkedCount > 0"
      class="mb-4"
    >
      <div class="flex items-center justify-between text-sm mb-1">
        <span class="text-neutral-500 dark:text-neutral-400">
          {{ checkedCount }} of {{ totalCount }} gathered
        </span>
        <UButton
          size="xs"
          variant="ghost"
          color="neutral"
          @click="clearAllChecked"
        >
          Clear
        </UButton>
      </div>
      <div class="h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
        <div
          class="h-full bg-sage-500 rounded-full transition-all duration-300"
          :style="{ width: `${(checkedCount / totalCount) * 100}%` }"
        />
      </div>
    </div>

    <!-- Ingredient List -->
    <ul class="space-y-2">
      <li
        v-for="ingredient in ingredients"
        :key="ingredient.id"
        class="group"
      >
        <button
          type="button"
          class="w-full flex items-start gap-3 p-2 -mx-2 rounded-lg transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700 text-left"
          :class="{ 'opacity-50': isChecked(ingredient.id) }"
          @click="toggleIngredient(ingredient.id)"
        >
          <!-- Checkbox -->
          <div
            class="flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
            :class="[
              isChecked(ingredient.id)
                ? 'bg-sage-500 border-sage-500'
                : 'border-neutral-300 dark:border-neutral-600 group-hover:border-primary-400'
            ]"
          >
            <UIcon
              v-if="isChecked(ingredient.id)"
              name="i-heroicons-check"
              class="w-3 h-3 text-white"
            />
          </div>

          <!-- Ingredient Content -->
          <div class="flex-1 min-w-0">
            <span
              class="font-medium text-neutral-700 dark:text-neutral-200"
              :class="{ 'line-through': isChecked(ingredient.id) }"
            >
              <span v-if="ingredient.amount || ingredient.unit">
                {{ scaledAmount(ingredient.amount) }}
                {{ ingredient.unit }}
              </span>
              {{ ingredient.item }}
            </span>
            <span
              v-if="ingredient.notes"
              class="block text-sm text-neutral-500 dark:text-neutral-400"
            >
              {{ ingredient.notes }}
            </span>
          </div>
        </button>
      </li>
    </ul>

    <template #footer>
      <UButton
        to="/shopping/new"
        color="primary"
        variant="soft"
        icon="i-heroicons-shopping-cart"
        block
        class="press-effect"
      >
        Add to Shopping List
      </UButton>
    </template>
  </UCard>
</template>
