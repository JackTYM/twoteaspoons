<script setup lang="ts">
import type { RecipeWithRelations } from '~/types/recipe'

definePageMeta({
  layout: false, // No layout for print page
})

const route = useRoute()
const username = computed(() => route.params.username as string)
const slug = computed(() => route.params.slug as string)
const format = ref((route.query.format as string) || '3x5')
const { getAuthHeaders } = useAuth()
const { getRecipeUrl } = useRecipeUrl()

const { data } = await useFetch<{ recipe: RecipeWithRelations }>(
  `/api/recipes/${username.value}/${slug.value}`,
  {
    headers: getAuthHeaders(),
  }
)
const recipe = computed(() => data.value?.recipe)

// Computed recipe URL for navigation
const recipeUrl = computed(() =>
  recipe.value ? getRecipeUrl(recipe.value) : '/browse'
)

useSeoMeta({
  title: computed(() =>
    recipe.value ? `Print: ${recipe.value.title}` : 'Print Recipe'
  ),
})

// Format dimensions in inches
interface FormatDimension {
  width: string
  height: string
  name: string
}

const formatDimensions: Record<string, FormatDimension> = {
  '3x5': { width: '5in', height: '3in', name: '3x5 Index Card' },
  '4x6': { width: '6in', height: '4in', name: '4x6 Card' },
  a6: { width: '4.13in', height: '5.83in', name: 'A6' },
  'half-letter': { width: '5.5in', height: '8.5in', name: 'Half Letter' },
  full: { width: '8.5in', height: '11in', name: 'Full Page' },
}

const defaultFormat: FormatDimension = {
  width: '5in',
  height: '3in',
  name: '3x5 Index Card',
}

const currentFormat = computed((): FormatDimension => {
  return formatDimensions[format.value] ?? defaultFormat
})

function selectFormat(newFormat: string): void {
  format.value = newFormat
  // Update URL without navigation
  const url = new URL(window.location.href)
  url.searchParams.set('format', newFormat)
  window.history.replaceState({}, '', url.toString())
}

function formatTime(minutes: number | null): string {
  if (!minutes) return ''
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins ? `${hours}h ${mins}m` : `${hours}h`
}

function getTotalTime(): string {
  if (!recipe.value) return ''
  const total = (recipe.value.prepTime || 0) + (recipe.value.cookTime || 0)
  return formatTime(total)
}

function print(): void {
  window.print()
}

// For multi-card layouts, check if content needs multiple cards
const needsMultipleCards = computed(() => {
  if (!recipe.value) return false
  if (format.value === '3x5') {
    return (
      recipe.value.ingredients.length > 6 ||
      recipe.value.instructions.length > 3
    )
  }
  if (format.value === '4x6') {
    return (
      recipe.value.ingredients.length > 10 ||
      recipe.value.instructions.length > 5
    )
  }
  return false
})
</script>

<template>
  <div class="print-container">
    <!-- Screen UI -->
    <div class="screen-only min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <!-- Header -->
      <div
        class="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 sticky top-0 z-10"
      >
        <div
          class="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between"
        >
          <NuxtLink
            :to="recipeUrl"
            class="flex items-center gap-2 text-neutral-500 hover:text-primary-500 transition-colors"
          >
            <UIcon name="i-heroicons-arrow-left" class="w-5 h-5" />
            <span class="hidden sm:inline">Back to recipe</span>
          </NuxtLink>
          <UButton
            color="primary"
            size="lg"
            icon="i-heroicons-printer"
            class="press-effect"
            @click="print"
          >
            Print Recipe
          </UButton>
        </div>
      </div>

      <!-- Main Content -->
      <div class="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div class="grid lg:grid-cols-2 gap-8">
          <!-- Left: Format Selection -->
          <div>
            <h2
              class="text-lg font-display text-neutral-700 dark:text-neutral-100 mb-4 flex items-center gap-2"
            >
              <UIcon
                name="i-heroicons-document"
                class="w-5 h-5 text-primary-500"
              />
              Choose Format
            </h2>

            <PrintFormatSelector
              v-if="recipe"
              :formats="formatDimensions"
              :selected-format="format"
              :ingredient-count="recipe.ingredients.length"
              :instruction-count="recipe.instructions.length"
              class="mb-6"
              @select="selectFormat"
            />

            <PrintInstructions :format="format" />
          </div>

          <!-- Right: Preview -->
          <div>
            <h2
              class="text-lg font-display text-neutral-700 dark:text-neutral-100 mb-4 flex items-center gap-2"
            >
              <UIcon name="i-heroicons-eye" class="w-5 h-5 text-primary-500" />
              Preview
            </h2>

            <div class="flex flex-col items-center">
              <PrintCardPreview
                v-if="recipe"
                :recipe="recipe"
                :format="format"
                :show-back="needsMultipleCards"
              />

              <p class="text-sm text-neutral-400 mt-4">
                Preview is scaled. Actual print will be
                {{ currentFormat.name }} size.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Print Content -->
    <div class="print-only">
      <div
        v-if="recipe"
        class="recipe-card"
        :style="{
          width: currentFormat.width,
          minHeight: currentFormat.height,
        }"
      >
        <div class="p-3">
          <h1 class="text-lg font-bold text-black leading-tight mb-1">
            {{ recipe.title }}
          </h1>
          <div class="flex gap-3 text-xs text-gray-600 mb-2">
            <span v-if="getTotalTime()">{{ getTotalTime() }}</span>
            <span v-if="recipe.servings">{{ recipe.servings }} servings</span>
          </div>

          <div v-if="format === '3x5' || format === '4x6'" class="text-xs">
            <h2 class="font-semibold text-gray-800 mb-1">Ingredients</h2>
            <ul class="space-y-0.5 mb-3">
              <li
                v-for="ing in recipe.ingredients"
                :key="ing.id"
                class="text-gray-700"
              >
                <span class="font-medium">{{ ing.amount }} {{ ing.unit }}</span>
                {{ ing.item }}
              </li>
            </ul>
          </div>

          <div v-if="format !== '3x5'" class="text-xs">
            <h2 class="font-semibold text-gray-800 mb-1">Instructions</h2>
            <ol class="space-y-1 list-decimal list-inside">
              <li
                v-for="inst in recipe.instructions"
                :key="inst.id"
                class="text-gray-700"
              >
                {{ inst.content }}
              </li>
            </ol>
          </div>
        </div>
      </div>

      <!-- Second page for 3x5 format -->
      <div
        v-if="recipe && format === '3x5'"
        class="recipe-card page-break"
        :style="{
          width: currentFormat.width,
          minHeight: currentFormat.height,
        }"
      >
        <div class="p-3">
          <h1 class="text-sm font-bold text-black mb-2">
            {{ recipe.title }} (Instructions)
          </h1>
          <ol class="space-y-1 list-decimal list-inside text-xs">
            <li
              v-for="inst in recipe.instructions"
              :key="inst.id"
              class="text-gray-700"
            >
              {{ inst.content }}
            </li>
          </ol>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Screen-only styles */
.screen-only {
  display: block;
}

.print-only {
  display: none;
}

/* Print styles */
@media print {
  .screen-only {
    display: none !important;
  }

  .print-only {
    display: block !important;
  }

  .recipe-card {
    page-break-inside: avoid;
    background: white;
  }

  .page-break {
    page-break-before: always;
  }

  @page {
    margin: 0.25in;
  }
}

/* Recipe card base styles */
.recipe-card {
  font-family: system-ui, -apple-system, sans-serif;
  overflow: hidden;
}
</style>
