<script setup lang="ts">
interface Ingredient {
  id: number
  amount: string | null
  unit: string | null
  item: string
}

interface Instruction {
  id: number
  content: string
}

interface Recipe {
  title: string
  prepTime: number | null
  cookTime: number | null
  servings: number | null
  ingredients: Ingredient[]
  instructions: Instruction[]
}

interface Props {
  recipe: Recipe
  format: string
  showBack: boolean
}

const props = defineProps<Props>()

const isFlipped = ref(false)

function toggleFlip(): void {
  if (props.showBack) {
    isFlipped.value = !isFlipped.value
  }
}

function formatTime(minutes: number | null): string {
  if (!minutes) return ''
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins ? `${hours}h ${mins}m` : `${hours}h`
}

const totalTime = computed(() => {
  const total = (props.recipe.prepTime || 0) + (props.recipe.cookTime || 0)
  return formatTime(total)
})

// Scale factor for preview (approximate)
type ScaleStyle = { width: string; minHeight: string; scale: string }

const defaultScale: ScaleStyle = { width: '300px', minHeight: '180px', scale: '0.9' }

const scales: Record<string, ScaleStyle> = {
  '3x5': defaultScale,
  '4x6': { width: '360px', minHeight: '240px', scale: '0.85' },
  'a6': { width: '250px', minHeight: '350px', scale: '0.8' },
  'half-letter': { width: '330px', minHeight: '510px', scale: '0.75' },
  'full': { width: '510px', minHeight: '660px', scale: '0.7' },
}

const scaleStyles = computed((): ScaleStyle => {
  return scales[props.format] ?? defaultScale
})
</script>

<template>
  <div class="relative perspective-1000">
    <!-- Card shadow/base -->
    <div
      class="absolute inset-0 bg-neutral-300 dark:bg-neutral-600 rounded-lg transform translate-x-1 translate-y-1"
      :style="{ width: scaleStyles.width, minHeight: scaleStyles.minHeight }"
    />

    <!-- Main card with flip animation -->
    <div
      class="relative bg-white rounded-lg border border-neutral-200 shadow-lg overflow-hidden transition-transform duration-500 cursor-pointer"
      :class="{ 'rotate-y-180': isFlipped && showBack }"
      :style="{ width: scaleStyles.width, minHeight: scaleStyles.minHeight, transformStyle: 'preserve-3d' }"
      @click="toggleFlip"
    >
      <!-- Front: Title & Ingredients -->
      <div
        class="p-4 backface-hidden"
        :class="{ 'invisible': isFlipped && showBack }"
      >
        <h2 class="font-bold text-base text-neutral-800 leading-tight mb-1 line-clamp-2">
          {{ recipe.title }}
        </h2>
        <div class="flex gap-3 text-xs text-neutral-500 mb-3">
          <span v-if="totalTime">{{ totalTime }}</span>
          <span v-if="recipe.servings">{{ recipe.servings }} servings</span>
        </div>

        <h3 class="font-semibold text-xs text-neutral-700 mb-2 uppercase tracking-wide">
          Ingredients
        </h3>
        <ul class="text-xs text-neutral-600 space-y-1">
          <li
            v-for="ing in recipe.ingredients.slice(0, format === '3x5' ? 6 : 10)"
            :key="ing.id"
            class="flex"
          >
            <span class="font-medium text-neutral-700 min-w-[60px]">
              {{ ing.amount }} {{ ing.unit }}
            </span>
            <span class="truncate">{{ ing.item }}</span>
          </li>
          <li
            v-if="recipe.ingredients.length > (format === '3x5' ? 6 : 10)"
            class="text-neutral-400 italic"
          >
            +{{ recipe.ingredients.length - (format === '3x5' ? 6 : 10) }} more...
          </li>
        </ul>

        <!-- Instructions (for larger formats) -->
        <template v-if="format !== '3x5' && format !== '4x6'">
          <h3 class="font-semibold text-xs text-neutral-700 mb-2 mt-4 uppercase tracking-wide">
            Instructions
          </h3>
          <ol class="text-xs text-neutral-600 space-y-1 list-decimal list-inside">
            <li
              v-for="inst in recipe.instructions"
              :key="inst.id"
              class="line-clamp-2"
            >
              {{ inst.content }}
            </li>
          </ol>
        </template>
      </div>

      <!-- Back: Instructions (for small formats) -->
      <div
        v-if="showBack"
        class="absolute inset-0 p-4 bg-white rotate-y-180 backface-hidden"
        :class="{ 'invisible': !isFlipped }"
      >
        <h2 class="font-bold text-sm text-neutral-800 mb-2">
          {{ recipe.title }}
          <span class="font-normal text-neutral-500">(continued)</span>
        </h2>

        <h3 class="font-semibold text-xs text-neutral-700 mb-2 uppercase tracking-wide">
          Instructions
        </h3>
        <ol class="text-xs text-neutral-600 space-y-1.5 list-decimal list-inside">
          <li
            v-for="inst in recipe.instructions"
            :key="inst.id"
          >
            {{ inst.content }}
          </li>
        </ol>
      </div>
    </div>

    <!-- Flip hint -->
    <p
      v-if="showBack"
      class="text-center text-xs text-neutral-400 mt-3 flex items-center justify-center gap-1"
    >
      <UIcon
        name="i-heroicons-arrow-path"
        class="w-3 h-3"
      />
      Click to flip
    </p>
  </div>
</template>

<style scoped>
.perspective-1000 {
  perspective: 1000px;
}

.rotate-y-180 {
  transform: rotateY(180deg);
}

.backface-hidden {
  backface-visibility: hidden;
}
</style>
