<script setup lang="ts">
import { transformToRecipeWithRelations } from '~/utils/transformCase'

definePageMeta({
  layout: false, // No layout for print page
})

const route = useRoute()
const username = computed(() => route.params.username as string)
const slug = computed(() => route.params.slug as string)
const format = ref((route.query.format as string) || '3x5')
const { getRecipeUrl } = useRecipeUrl()

// Services
const recipeService = useRecipeService()

const { data } = await useAsyncData(
  `print-${username.value}-${slug.value}`,
  async () => {
    const recipeData = await recipeService.getRecipeBySlug(username.value, slug.value)
    if (!recipeData) {
      throw createError({ statusCode: 404, message: 'Recipe not found' })
    }
    return { recipe: transformToRecipeWithRelations(recipeData) }
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

// Rotate text toggle for vertical printing
const rotateText = ref(false)

// Scale for print (100 = default, smaller = bigger margins/smaller text)
const printScale = ref(100)

const defaultFormat: FormatDimension = {
  width: '5in',
  height: '3in',
  name: '3x5 Index Card',
}

const currentFormat = computed((): FormatDimension => {
  return formatDimensions[format.value] ?? defaultFormat
})

// Dynamic print styles for proper PDF page size
const printStyles = computed(() => {
  const width = currentFormat.value.width
  const height = currentFormat.value.height
  const scale = printScale.value / 100

  if (rotateText.value) {
    // Rotated mode uses PDF endpoint, but still need basic print styles
    // in case user triggers native print
    return `
      @media print {
        @page {
          size: ${height} ${width};
          margin: 0.2in;
        }
      }
    `
  }

  // Normal: left-aligned, vertically centered
  const normalScaleTransform = scale !== 1 ? `transform: scale(${scale}); transform-origin: left center;` : ''
  return `
    @media print {
      @page {
        size: ${width} ${height};
        margin: 0.25in;
      }
      .recipe-card {
        display: flex;
        align-items: center;
      }
      .recipe-card .card-content {
        ${normalScaleTransform}
      }
    }
  `
})

// Inject dynamic print styles into head
useHead({
  style: [
    {
      innerHTML: printStyles,
    },
  ],
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
  if (rotateText.value) {
    // For rotated mode, use the PDF generator endpoint
    const pdfUrl = `/api/recipes/${username.value}/${slug.value}/print-pdf?format=${format.value}&rotated=true&scale=${printScale.value}`
    window.open(pdfUrl, '_blank')
  } else {
    window.print()
  }
}

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
              class="mb-4"
              @select="selectFormat"
            />

            <!-- Rotate text toggle -->
            <div
              v-if="format === '3x5' || format === '4x6'"
              class="flex items-center gap-3 p-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl mb-4"
            >
              <USwitch v-model="rotateText" />
              <div>
                <p class="text-sm font-medium text-neutral-700 dark:text-neutral-100">
                  Rotate for vertical printing
                </p>
                <p class="text-xs text-neutral-500 dark:text-neutral-400">
                  Print landscape, then turn card sideways
                </p>
              </div>
            </div>

            <!-- Print scale -->
            <div class="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl mb-6">
              <div class="flex items-center justify-between mb-2">
                <p class="text-sm font-medium text-neutral-700 dark:text-neutral-100">
                  Scale
                </p>
                <span class="text-sm text-neutral-500 dark:text-neutral-400">
                  {{ printScale }}%
                </span>
              </div>
              <input
                v-model.number="printScale"
                type="range"
                min="25"
                max="150"
                step="5"
                class="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
              >
              <div class="flex justify-between text-xs text-neutral-400 mt-1">
                <span>25%</span>
                <span>100%</span>
                <span>150%</span>
              </div>
            </div>

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
                :rotated="rotateText"
                :print-scale="printScale"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Print Content -->
    <div class="print-only">
      <!-- First card -->
      <div
        v-if="recipe"
        class="recipe-card"
        :style="{
          width: currentFormat.width,
          minHeight: currentFormat.height,
        }"
      >
        <div class="card-content p-3">
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

          <div class="text-xs">
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
}

/* Recipe card base styles */
.recipe-card {
  font-family: system-ui, -apple-system, sans-serif;
  overflow: hidden;
}
</style>
