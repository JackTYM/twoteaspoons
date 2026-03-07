<script setup lang="ts">
import type { ImportResponse, ImportRecipe } from '~/types/import'

definePageMeta({
  middleware: 'auth',
})

useSeoMeta({
  title: 'Import Recipes',
})

const { getAuthHeaders } = useAuth()

// File input ref
const fileInput = ref<HTMLInputElement | null>(null)

// State
const jsonContent = ref('')
const parsedRecipes = ref<ImportRecipe[]>([])
const parseError = ref<string | null>(null)
const importing = ref(false)
const importResult = ref<ImportResponse | null>(null)

// Valid category slugs for documentation
const validCategories = {
  meal: ['breakfast', 'brunch', 'lunch', 'dinner', 'snack', 'dessert', 'appetizer', 'side-dish', 'drink', 'sauce'],
  cuisine: ['italian', 'mexican', 'chinese', 'japanese', 'korean', 'thai', 'vietnamese', 'indian', 'mediterranean', 'greek', 'middle-eastern', 'french', 'spanish', 'american', 'southern', 'cajun', 'caribbean', 'african', 'british', 'german', 'brazilian', 'peruvian'],
  dietary: ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 'egg-free', 'keto', 'low-carb', 'paleo', 'whole30', 'low-sodium', 'low-fat', 'high-protein', 'diabetic-friendly', 'heart-healthy', 'kosher', 'halal'],
  style: ['quick-easy', '30-min', '15-min', 'one-pot', 'one-pan', 'sheet-pan', 'slow-cooker', 'instant-pot', 'air-fryer', 'grilling', 'no-cook', 'make-ahead', 'freezer-friendly', 'meal-prep', 'batch-cooking', 'budget-friendly'],
  dish: ['soup', 'salad', 'sandwich', 'pasta', 'pizza', 'stir-fry', 'curry', 'casserole', 'stew', 'roast', 'tacos', 'burger', 'bowl', 'wrap', 'noodles', 'rice-dish', 'bread', 'cake', 'cookies', 'pie', 'smoothie', 'cocktail'],
  protein: ['chicken', 'beef', 'pork', 'fish', 'shrimp', 'seafood', 'turkey', 'lamb', 'tofu', 'beans', 'eggs'],
  occasion: ['weeknight', 'date-night', 'party', 'potluck', 'holiday', 'thanksgiving', 'christmas', 'easter', 'july-4th', 'game-day', 'bbq', 'picnic', 'camping', 'kids', 'comfort-food', 'healthy', 'indulgent'],
  season: ['spring', 'summer', 'fall', 'winter'],
}

function handleFileSelect(event: Event): void {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e): void => {
    jsonContent.value = e.target?.result as string
    parseJson()
  }
  reader.readAsText(file)
}

function parseJson(): void {
  parseError.value = null
  parsedRecipes.value = []
  importResult.value = null

  if (!jsonContent.value.trim()) {
    return
  }

  try {
    const data = JSON.parse(jsonContent.value)

    // Handle both { recipes: [...] } and bare array formats
    let recipes: ImportRecipe[]
    if (Array.isArray(data)) {
      recipes = data
    } else if (data.recipes && Array.isArray(data.recipes)) {
      recipes = data.recipes
    } else {
      parseError.value = 'JSON must be an array of recipes or an object with a "recipes" array'
      return
    }

    if (recipes.length === 0) {
      parseError.value = 'No recipes found in JSON'
      return
    }

    if (recipes.length > 100) {
      parseError.value = 'Maximum 100 recipes per import'
      return
    }

    parsedRecipes.value = recipes
  } catch (err) {
    parseError.value = err instanceof Error ? err.message : 'Invalid JSON'
  }
}

async function importRecipes(): Promise<void> {
  if (parsedRecipes.value.length === 0) return

  importing.value = true
  importResult.value = null

  try {
    const result = await $fetch<ImportResponse>('/api/import/recipes', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: { recipes: parsedRecipes.value },
    })
    importResult.value = result
  } catch (err) {
    console.error('Import failed:', err)
    parseError.value = err instanceof Error ? err.message : 'Import failed'
  }

  importing.value = false
}

function reset(): void {
  jsonContent.value = ''
  parsedRecipes.value = []
  parseError.value = null
  importResult.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

// Example JSON for documentation
const exampleJson = `{
  "recipes": [
    {
      "title": "Simple Pasta",
      "description": "A quick weeknight pasta dish",
      "prepTime": 10,
      "cookTime": 20,
      "servings": 4,
      "categories": ["dinner", "italian", "pasta", "quick-easy"],
      "ingredients": [
        { "amount": "1", "unit": "lb", "item": "spaghetti" },
        { "amount": "2", "unit": "tbsp", "item": "olive oil" },
        { "amount": "4", "unit": "cloves", "item": "garlic", "notes": "minced" },
        { "amount": "1/4", "unit": "tsp", "item": "red pepper flakes" },
        { "item": "salt and pepper", "notes": "to taste" }
      ],
      "instructions": [
        { "content": "Bring a large pot of salted water to boil." },
        { "content": "Cook pasta according to package directions.", "timerMinutes": 10, "ingredientIndices": [0] },
        { "content": "Heat olive oil in a large skillet over medium heat.", "ingredientIndices": [1] },
        { "content": "Add garlic and red pepper flakes, cook until fragrant.", "timerMinutes": 1, "ingredientIndices": [2, 3] },
        { "content": "Toss pasta with garlic oil and season to taste.", "ingredientIndices": [4] }
      ],
      "source": {
        "author": "Test Kitchen",
        "site": "Example Recipes"
      }
    }
  ]
}`
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
    <div class="mb-8">
      <h1 class="text-2xl font-display text-neutral-700 dark:text-neutral-100">
        Import Recipes
      </h1>
      <p class="text-neutral-500 dark:text-neutral-400 mt-2">
        Import multiple recipes at once from a JSON file
      </p>
    </div>

    <!-- Import Result -->
    <div
      v-if="importResult"
      class="mb-8 p-6 rounded-xl"
      :class="importResult.failed === 0 ? 'bg-sage-100 dark:bg-sage-900/30' : 'bg-butter-100 dark:bg-butter-900/30'"
    >
      <div class="flex items-center gap-3 mb-4">
        <UIcon
          :name="importResult.failed === 0 ? 'i-heroicons-check-circle' : 'i-heroicons-exclamation-triangle'"
          class="w-6 h-6"
          :class="importResult.failed === 0 ? 'text-sage-600 dark:text-sage-400' : 'text-butter-600 dark:text-butter-400'"
        />
        <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">
          Import Complete
        </h2>
      </div>

      <div class="grid grid-cols-3 gap-4 mb-4">
        <div class="text-center p-3 bg-white dark:bg-neutral-800 rounded-lg">
          <p class="text-2xl font-bold text-neutral-700 dark:text-neutral-100">
            {{ importResult.total }}
          </p>
          <p class="text-sm text-neutral-500 dark:text-neutral-400">
            Total
          </p>
        </div>
        <div class="text-center p-3 bg-white dark:bg-neutral-800 rounded-lg">
          <p class="text-2xl font-bold text-sage-600 dark:text-sage-400">
            {{ importResult.successful }}
          </p>
          <p class="text-sm text-neutral-500 dark:text-neutral-400">
            Successful
          </p>
        </div>
        <div class="text-center p-3 bg-white dark:bg-neutral-800 rounded-lg">
          <p class="text-2xl font-bold" :class="importResult.failed > 0 ? 'text-terracotta-600 dark:text-terracotta-400' : 'text-neutral-400'">
            {{ importResult.failed }}
          </p>
          <p class="text-sm text-neutral-500 dark:text-neutral-400">
            Failed
          </p>
        </div>
      </div>

      <!-- Individual results -->
      <div class="space-y-2 max-h-64 overflow-y-auto">
        <div
          v-for="(result, index) in importResult.results"
          :key="index"
          class="flex items-center justify-between p-2 bg-white dark:bg-neutral-800 rounded-lg"
        >
          <div class="flex items-center gap-2">
            <UIcon
              :name="result.success ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
              class="w-4 h-4"
              :class="result.success ? 'text-sage-500' : 'text-terracotta-500'"
            />
            <span class="text-neutral-700 dark:text-neutral-100">{{ result.title }}</span>
          </div>
          <div v-if="result.success && result.slug" class="text-sm text-neutral-500">
            <NuxtLink
              :to="`/browse`"
              class="text-primary-500 hover:underline"
            >
              View
            </NuxtLink>
          </div>
          <div v-else-if="result.error" class="text-sm text-terracotta-500">
            {{ result.error }}
          </div>
        </div>
      </div>

      <div class="mt-4 flex gap-2">
        <UButton
          color="primary"
          @click="reset"
        >
          Import More
        </UButton>
        <UButton
          to="/browse"
          color="neutral"
          variant="outline"
        >
          Browse Recipes
        </UButton>
      </div>
    </div>

    <!-- Import Form -->
    <template v-else>
      <!-- File Upload -->
      <div class="mb-6">
        <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-100 mb-2">
          Upload JSON File
        </label>
        <input
          ref="fileInput"
          type="file"
          accept=".json,application/json"
          class="block w-full text-sm text-neutral-500 dark:text-neutral-400
            file:mr-4 file:py-2 file:px-4
            file:rounded-lg file:border-0
            file:text-sm file:font-medium
            file:bg-primary-50 file:text-primary-700
            dark:file:bg-primary-900/30 dark:file:text-primary-300
            hover:file:bg-primary-100 dark:hover:file:bg-primary-900/50
            cursor-pointer"
          @change="handleFileSelect"
        >
      </div>

      <!-- Or paste JSON -->
      <div class="mb-6">
        <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-100 mb-2">
          Or Paste JSON
        </label>
        <textarea
          v-model="jsonContent"
          rows="12"
          class="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-100 font-mono text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          placeholder='{ "recipes": [...] }'
          @input="parseJson"
        />
      </div>

      <!-- Parse Error -->
      <div
        v-if="parseError"
        class="mb-6 p-4 rounded-xl bg-terracotta-100 dark:bg-terracotta-900/30 text-terracotta-700 dark:text-terracotta-300"
      >
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5" />
          <span>{{ parseError }}</span>
        </div>
      </div>

      <!-- Parsed Preview -->
      <div v-if="parsedRecipes.length > 0" class="mb-6">
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">
            Preview ({{ parsedRecipes.length }} recipes)
          </h2>
          <UButton
            color="primary"
            :loading="importing"
            :disabled="importing"
            @click="importRecipes"
          >
            Import All
          </UButton>
        </div>
        <div class="space-y-2 max-h-64 overflow-y-auto">
          <div
            v-for="(recipe, index) in parsedRecipes"
            :key="index"
            class="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg"
          >
            <div class="flex items-center justify-between">
              <span class="font-medium text-neutral-700 dark:text-neutral-100">
                {{ recipe.title || '(untitled)' }}
              </span>
              <span class="text-sm text-neutral-500 dark:text-neutral-400">
                {{ recipe.ingredients?.length || 0 }} ingredients, {{ recipe.instructions?.length || 0 }} steps
              </span>
            </div>
            <div v-if="recipe.categories?.length" class="mt-1 flex flex-wrap gap-1">
              <span
                v-for="cat in recipe.categories.slice(0, 5)"
                :key="cat"
                class="px-2 py-0.5 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full"
              >
                {{ cat }}
              </span>
              <span
                v-if="recipe.categories.length > 5"
                class="px-2 py-0.5 text-xs bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 rounded-full"
              >
                +{{ recipe.categories.length - 5 }} more
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Schema Documentation -->
      <div class="border-t border-neutral-200 dark:border-neutral-700 pt-8">
        <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100 mb-4">
          JSON Schema
        </h2>

        <div class="mb-6">
          <h3 class="font-medium text-neutral-700 dark:text-neutral-100 mb-2">
            Example
          </h3>
          <pre class="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-xs overflow-x-auto text-neutral-700 dark:text-neutral-300">{{ exampleJson }}</pre>
        </div>

        <!-- Valid Categories -->
        <div class="space-y-4">
          <h3 class="font-medium text-neutral-700 dark:text-neutral-100">
            Valid Category Slugs
          </h3>
          <div
            v-for="(slugs, type) in validCategories"
            :key="type"
            class="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-xl"
          >
            <h4 class="font-medium text-neutral-700 dark:text-neutral-100 mb-2 capitalize">
              {{ type }}
            </h4>
            <div class="flex flex-wrap gap-1">
              <code
                v-for="slug in slugs"
                :key="slug"
                class="px-2 py-0.5 text-xs bg-white dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded"
              >
                {{ slug }}
              </code>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
