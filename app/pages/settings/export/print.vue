<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: false,
})

const route = useRoute()
const format = (route.query.format as string) || 'full'

interface FormatDimension {
  width: string
  height: string
  name: string
}

interface ExportIngredient {
  amount: string | null
  unit: string | null
  item: string
  notes: string | null
}

interface ExportInstruction {
  step: number
  content: string
  timerMinutes: number | null
}

interface ExportRecipe {
  id: number
  title: string
  description: string | null
  coverPhoto: string | null
  prepTime: number | null
  cookTime: number | null
  servings: number | null
  ingredients: ExportIngredient[]
  instructions: ExportInstruction[]
}

interface ExportResponse {
  recipes: ExportRecipe[]
  favorites: ExportRecipe[]
}

const FORMAT_FULL: FormatDimension = { width: '8.5in', height: '11in', name: 'Full Page' }

const formatDimensions: Record<string, FormatDimension> = {
  '3x5': { width: '5in', height: '3in', name: '3x5 Index Card' },
  '4x6': { width: '6in', height: '4in', name: '4x6 Card' },
  'a6': { width: '4.13in', height: '5.83in', name: 'A6' },
  'half-letter': { width: '5.5in', height: '8.5in', name: 'Half Letter' },
  'full': FORMAT_FULL,
}

const currentFormat = computed((): FormatDimension => {
  const found = formatDimensions[format]
  return found ?? FORMAT_FULL
})
const isSmallFormat = computed(() => format === '3x5' || format === '4x6')

const { data: exportData, status } = await useFetch<ExportResponse>('/api/export/recipes')

function formatTime(minutes: number | null): string {
  if (!minutes) return ''
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins ? `${hours}h ${mins}m` : `${hours}h`
}

function totalTime(recipe: ExportRecipe): string {
  return formatTime((recipe.prepTime || 0) + (recipe.cookTime || 0))
}

function needsSplit(recipe: ExportRecipe): boolean {
  return format === '3x5' || (format === '4x6' && (recipe.ingredients.length > 10 || recipe.instructions.length > 5))
}

function printPage(): void {
  window.print()
}

onMounted(() => {
  if (status.value === 'success' && exportData.value) {
    setTimeout(printPage, 500)
  }
})

watch(status, (newStatus) => {
  if (newStatus === 'success' && exportData.value) {
    setTimeout(printPage, 500)
  }
})
</script>

<template>
  <div class="print-container">
    <div v-if="status === 'pending'" class="loading">
      <p>Loading recipes...</p>
    </div>

    <div v-else-if="status === 'error'" class="error">
      <p>Failed to load recipes. Please try again.</p>
    </div>

    <div v-else-if="exportData" class="recipes">
      <template v-for="recipe in exportData.recipes" :key="recipe.id">
        <!-- Small formats need two pages -->
        <template v-if="needsSplit(recipe)">
          <!-- Ingredients page -->
          <div
            class="recipe-card"
            :style="{ width: currentFormat.width, height: currentFormat.height }"
          >
            <div class="card-content">
              <h1 class="title">{{ recipe.title }}</h1>
              <div class="meta">
                <span v-if="totalTime(recipe)">{{ totalTime(recipe) }}</span>
                <span v-if="recipe.servings">{{ recipe.servings }} servings</span>
              </div>
              <h2 class="section-title">Ingredients</h2>
              <ul class="ingredients">
                <li v-for="(ing, idx) in recipe.ingredients" :key="idx">
                  <span class="amount">{{ ing.amount || '' }} {{ ing.unit || '' }}</span>
                  {{ ing.item }}
                </li>
              </ul>
            </div>
          </div>

          <!-- Instructions page -->
          <div
            class="recipe-card"
            :style="{ width: currentFormat.width, height: currentFormat.height }"
          >
            <div class="card-content">
              <h1 class="title small">{{ recipe.title }} <span class="continued">(Instructions)</span></h1>
              <ol class="instructions">
                <li v-for="(inst, idx) in recipe.instructions" :key="idx">
                  {{ inst.content }}
                </li>
              </ol>
            </div>
          </div>
        </template>

        <!-- Larger formats - single page -->
        <template v-else>
          <div
            class="recipe-card"
            :style="{ width: currentFormat.width, minHeight: currentFormat.height }"
          >
            <div class="card-content">
              <h1 class="title">{{ recipe.title }}</h1>
              <div class="meta">
                <span v-if="totalTime(recipe)">{{ totalTime(recipe) }}</span>
                <span v-if="recipe.servings">{{ recipe.servings }} servings</span>
              </div>

              <div :class="{ 'two-column': !isSmallFormat }">
                <div class="column">
                  <h2 class="section-title">Ingredients</h2>
                  <ul class="ingredients">
                    <li v-for="(ing, idx) in recipe.ingredients" :key="idx">
                      <span class="amount">{{ ing.amount || '' }} {{ ing.unit || '' }}</span>
                      {{ ing.item }}
                    </li>
                  </ul>
                </div>

                <div class="column">
                  <h2 class="section-title">Instructions</h2>
                  <ol class="instructions">
                    <li v-for="(inst, idx) in recipe.instructions" :key="idx">
                      {{ inst.content }}
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </template>
      </template>
    </div>

    <!-- Print button (hidden when printing) -->
    <button class="print-button no-print" @click="printPage">
      Print / Save as PDF
    </button>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
  font-size: v-bind('isSmallFormat ? "9pt" : "11pt"');
  line-height: 1.4;
  color: #333;
  background: #f5f5f5;
}

.print-container {
  padding: 20px;
}

.loading,
.error {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  font-size: 16px;
  color: #666;
}

.recipes {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.recipe-card {
  background: white;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  page-break-after: always;
}

.card-content {
  padding: v-bind('isSmallFormat ? "12pt" : "24pt"');
}

.title {
  font-size: v-bind('isSmallFormat ? "12pt" : "18pt"');
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 4pt;
  line-height: 1.2;
}

.title.small {
  font-size: v-bind('isSmallFormat ? "10pt" : "14pt"');
}

.continued {
  font-weight: 400;
  color: #666;
}

.meta {
  display: flex;
  gap: 12pt;
  font-size: v-bind('isSmallFormat ? "8pt" : "10pt"');
  color: #666;
  margin-bottom: v-bind('isSmallFormat ? "8pt" : "16pt"');
}

.section-title {
  font-size: v-bind('isSmallFormat ? "9pt" : "12pt"');
  font-weight: 600;
  color: #444;
  margin-bottom: 6pt;
  text-transform: uppercase;
  letter-spacing: 0.5pt;
}

.two-column {
  display: flex;
  gap: 24pt;
}

.two-column .column {
  flex: 1;
}

.ingredients {
  list-style: none;
  margin-bottom: v-bind('isSmallFormat ? "8pt" : "16pt"');
}

.ingredients li {
  margin-bottom: 2pt;
  padding-left: 8pt;
  position: relative;
}

.ingredients li::before {
  content: "\2022";
  position: absolute;
  left: 0;
  color: #999;
}

.amount {
  font-weight: 500;
  color: #1a1a1a;
}

.instructions {
  margin-left: 16pt;
}

.instructions li {
  margin-bottom: 4pt;
}

.print-button {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 12px 24px;
  background: #c97b5d;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.print-button:hover {
  background: #a65e42;
}

@media print {
  body {
    background: white;
  }

  .print-container {
    padding: 0;
  }

  .recipes {
    gap: 0;
  }

  .recipe-card {
    box-shadow: none;
    page-break-inside: avoid;
  }

  .no-print {
    display: none !important;
  }

  @page {
    margin: 0;
    size: v-bind('currentFormat.width') v-bind('currentFormat.height');
  }
}
</style>
