<script setup lang="ts">
import type { RecipeWithRelations } from '~/types/recipe'

definePageMeta({
  layout: false, // No layout for print page
})

const route = useRoute()
const id = computed(() => route.params.id as string)
const format = computed(() => (route.query.format as string) || '3x5')

const { data } = await useFetch<{ recipe: RecipeWithRelations }>(`/api/recipes/${id.value}`)
const recipe = computed(() => data.value?.recipe)

useSeoMeta({
  title: computed(() => recipe.value ? `Print: ${recipe.value.title}` : 'Print Recipe'),
})

// Format dimensions in inches
interface FormatDimension {
  width: string
  height: string
  name: string
}

const formatDimensions: Record<string, FormatDimension> = {
  '3x5': { width: '5in', height: '3in', name: '3×5 Index Card' },
  '4x6': { width: '6in', height: '4in', name: '4×6 Card' },
  'a6': { width: '4.13in', height: '5.83in', name: 'A6' },
  'half-letter': { width: '5.5in', height: '8.5in', name: 'Half Letter' },
  'full': { width: '8.5in', height: '11in', name: 'Full Page' },
}

const defaultFormat: FormatDimension = { width: '5in', height: '3in', name: '3×5 Index Card' }

const currentFormat = computed((): FormatDimension => {
  return formatDimensions[format.value] ?? defaultFormat
})

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

// For multi-card layouts, split content
const needsMultipleCards = computed(() => {
  if (!recipe.value || format.value !== '3x5') return false
  // Rough estimate: if too many ingredients or instructions
  return recipe.value.ingredients.length > 8 || recipe.value.instructions.length > 4
})
</script>

<template>
  <div class="print-container">
    <!-- Screen UI -->
    <div class="screen-only bg-neutral-100 dark:bg-neutral-900 min-h-screen p-8">
      <div class="max-w-2xl mx-auto">
        <div class="flex items-center justify-between mb-6">
          <NuxtLink
            :to="`/recipes/${id}`"
            class="text-neutral-500 hover:text-primary-500 flex items-center gap-1"
          >
            <UIcon name="i-heroicons-arrow-left" />
            Back to recipe
          </NuxtLink>
          <UButton
            color="primary"
            icon="i-heroicons-printer"
            @click="print"
          >
            Print
          </UButton>
        </div>

        <!-- Format Selector -->
        <UCard class="mb-6">
          <h2 class="font-semibold mb-4 text-neutral-700 dark:text-neutral-100">
            Print Format
          </h2>
          <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <NuxtLink
              v-for="(dims, key) in formatDimensions"
              :key="key"
              :to="`/recipes/${id}/print?format=${key}`"
              class="p-3 rounded-lg border-2 text-center transition-all"
              :class="format === key
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'"
            >
              <div class="text-sm font-medium text-neutral-700 dark:text-neutral-100">
                {{ dims.name }}
              </div>
            </NuxtLink>
          </div>
        </UCard>

        <!-- Preview -->
        <div class="bg-white rounded-lg shadow-lg p-4 overflow-auto">
          <p class="text-sm text-neutral-500 mb-4 text-center">Preview (not to scale)</p>
          <div class="flex justify-center">
            <div
              class="recipe-card border border-neutral-300 bg-white transform scale-90 origin-top"
              :style="{
                width: currentFormat.width,
                minHeight: currentFormat.height,
              }"
            >
              <!-- Card 1: Title & Ingredients -->
              <div class="p-3">
                <h1 class="text-lg font-bold text-neutral-800 leading-tight mb-1">
                  {{ recipe?.title }}
                </h1>
                <div class="flex gap-3 text-xs text-neutral-500 mb-2">
                  <span v-if="getTotalTime()">{{ getTotalTime() }}</span>
                  <span v-if="recipe?.servings">{{ recipe.servings }} servings</span>
                </div>
                <div class="text-xs">
                  <h2 class="font-semibold text-neutral-700 mb-1">Ingredients</h2>
                  <ul class="space-y-0.5">
                    <li
                      v-for="ing in recipe?.ingredients"
                      :key="ing.id"
                      class="text-neutral-600"
                    >
                      <span class="font-medium">{{ ing.amount }} {{ ing.unit }}</span>
                      {{ ing.item }}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <!-- Second card for multi-card layouts -->
          <div
            v-if="needsMultipleCards"
            class="flex justify-center mt-4"
          >
            <div
              class="recipe-card border border-neutral-300 bg-white transform scale-90 origin-top"
              :style="{
                width: currentFormat.width,
                minHeight: currentFormat.height,
              }"
            >
              <div class="p-3">
                <h1 class="text-sm font-bold text-neutral-800 mb-2">
                  {{ recipe?.title }} (continued)
                </h1>
                <div class="text-xs">
                  <h2 class="font-semibold text-neutral-700 mb-1">Instructions</h2>
                  <ol class="space-y-1 list-decimal list-inside">
                    <li
                      v-for="inst in recipe?.instructions"
                      :key="inst.id"
                      class="text-neutral-600"
                    >
                      {{ inst.content }}
                    </li>
                  </ol>
                </div>
              </div>
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

          <div
            v-if="format === '3x5' || format === '4x6'"
            class="text-xs"
          >
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

          <div
            v-if="format !== '3x5'"
            class="text-xs"
          >
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
