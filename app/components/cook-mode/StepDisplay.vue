<script setup lang="ts">
interface Ingredient {
  id: number
  amount: string | null
  unit: string | null
  item: string
  notes: string | null
}

interface LinkedIngredientWithPartial {
  ingredient: Ingredient
  partialAmount?: string | null
  partialUnit?: string | null
}

interface Props {
  content: string
  stepIndex: number
  timerMinutes?: number | null
  linkedIngredients?: LinkedIngredientWithPartial[]
  scale?: number
}

const props = withDefaults(defineProps<Props>(), {
  timerMinutes: null,
  linkedIngredients: () => [],
  scale: 1,
})

const emit = defineEmits<{
  startTimer: [minutes: number]
}>()

// Adaptive font size based on content length
const fontSize = computed(() => {
  const len = props.content.length
  if (len < 50) return 'text-4xl sm:text-5xl'
  if (len < 100) return 'text-3xl sm:text-4xl'
  if (len < 200) return 'text-2xl sm:text-3xl'
  return 'text-xl sm:text-2xl'
})

// Scale amount for display
function scaledAmount(amount: string | null): string {
  if (!amount) return ''
  const num = parseFloat(amount)
  if (isNaN(num)) return amount
  const scaled = num * props.scale
  if (scaled === Math.floor(scaled)) return String(scaled)
  if (scaled < 1) return scaled.toFixed(2).replace(/\.?0+$/, '')
  return scaled.toFixed(1).replace(/\.?0+$/, '')
}

// Format ingredient for display - uses partial amount if specified
function formatIngredient(linked: LinkedIngredientWithPartial): string {
  const { ingredient, partialAmount, partialUnit } = linked
  const parts = []

  // Use partial amount if specified, otherwise full ingredient amount
  const amount = partialAmount !== undefined && partialAmount !== null
    ? scaledAmount(partialAmount)
    : scaledAmount(ingredient.amount)

  // Use partial unit if specified, otherwise ingredient unit
  const unit = partialUnit !== undefined && partialUnit !== null
    ? partialUnit
    : ingredient.unit

  if (amount) parts.push(amount)
  if (unit) parts.push(unit)
  parts.push(ingredient.item)
  return parts.join(' ')
}
</script>

<template>
  <div class="flex-1 flex items-center justify-center p-6 sm:p-8">
    <Transition
      name="step"
      mode="out-in"
    >
      <div
        :key="stepIndex"
        class="max-w-4xl text-center"
      >
        <!-- Step number badge -->
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-500/20 text-primary-400 font-bold text-lg mb-6">
          {{ stepIndex + 1 }}
        </div>

        <!-- Step content -->
        <p
          :class="[fontSize, 'leading-relaxed font-light tracking-wide text-neutral-100']"
        >
          {{ content }}
        </p>

        <!-- Linked ingredients for this step -->
        <Transition
          name="ingredients"
          mode="out-in"
        >
          <div
            v-if="linkedIngredients.length > 0"
            class="mt-8 p-4 bg-neutral-800/50 rounded-xl border border-neutral-700/50 max-w-lg mx-auto"
          >
            <p class="text-sm text-neutral-400 mb-3 flex items-center justify-center gap-2">
              <UIcon
                name="i-heroicons-list-bullet"
                class="w-4 h-4"
              />
              For this step
            </p>
            <div class="flex flex-wrap justify-center gap-2">
              <span
                v-for="linked in linkedIngredients"
                :key="linked.ingredient.id"
                class="inline-flex items-center px-3 py-1.5 bg-primary-900/40 text-primary-300 rounded-full text-sm font-medium"
              >
                {{ formatIngredient(linked) }}
              </span>
            </div>
          </div>
        </Transition>

        <!-- Timer button -->
        <div
          v-if="timerMinutes"
          class="mt-8"
        >
          <UButton
            color="warning"
            size="xl"
            class="press-effect"
            @click="emit('startTimer', timerMinutes)"
          >
            <UIcon
              name="i-heroicons-clock"
              class="w-6 h-6 mr-2"
            />
            Start {{ timerMinutes }} min timer
          </UButton>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.step-enter-active,
.step-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.step-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.step-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

.ingredients-enter-active,
.ingredients-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.ingredients-enter-from,
.ingredients-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
