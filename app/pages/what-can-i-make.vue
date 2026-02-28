<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

useSeoMeta({
  title: 'What Can I Make?',
})

interface IdentifiedIngredient {
  name: string
  quantity?: string
  confidence: 'high' | 'medium' | 'low'
}

interface RecipeMatch {
  recipe: {
    id: number
    title: string
    coverPhoto: string | null
    prepTime: number | null
    cookTime: number | null
  }
  matchPercentage: number
  missingIngredients: string[]
  matchedIngredients: string[]
}

interface AnalysisResult {
  identifiedIngredients: IdentifiedIngredient[]
  recipes: RecipeMatch[]
}

const imagePreview = ref<string | null>(null)
const selectedFile = ref<File | null>(null)
const analyzing = ref(false)
const result = ref<AnalysisResult | null>(null)
const error = ref<string | null>(null)

const fileInputRef = ref<HTMLInputElement | null>(null)

function selectImage(): void {
  fileInputRef.value?.click()
}

function handleFileSelect(event: Event): void {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    processFile(file)
  }
}

function handleDrop(event: DragEvent): void {
  event.preventDefault()
  const file = event.dataTransfer?.files[0]
  if (file && file.type.startsWith('image/')) {
    processFile(file)
  }
}

function handleDragOver(event: DragEvent): void {
  event.preventDefault()
}

function processFile(file: File): void {
  selectedFile.value = file
  const reader = new FileReader()
  reader.onload = (e): void => {
    imagePreview.value = e.target?.result as string
  }
  reader.readAsDataURL(file)
  result.value = null
  error.value = null
}

async function analyzeImage(): Promise<void> {
  if (!selectedFile.value) return

  analyzing.value = true
  error.value = null

  try {
    const formData = new FormData()
    formData.append('image', selectedFile.value)

    const response = await $fetch<AnalysisResult>('/api/what-can-i-make', {
      method: 'POST',
      body: formData,
    })

    result.value = response
  } catch (err) {
    console.error('Analysis failed:', err)
    error.value = 'Failed to analyze image. Please try again.'
  }

  analyzing.value = false
}

function clearImage(): void {
  imagePreview.value = null
  selectedFile.value = null
  result.value = null
  error.value = null
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

function getConfidenceColor(confidence: string): string {
  switch (confidence) {
    case 'high':
      return 'text-green-600 dark:text-green-400'
    case 'medium':
      return 'text-yellow-600 dark:text-yellow-400'
    default:
      return 'text-red-600 dark:text-red-400'
  }
}

// Categorize recipes by match percentage
const perfectMatches = computed(() =>
  result.value?.recipes.filter(r => r.matchPercentage === 100) || []
)

const almostThere = computed(() =>
  result.value?.recipes.filter(r => r.matchPercentage >= 70 && r.matchPercentage < 100) || []
)

const needAFew = computed(() =>
  result.value?.recipes.filter(r => r.matchPercentage >= 30 && r.matchPercentage < 70) || []
)
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
    <!-- Header -->
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-neutral-700 dark:text-neutral-50 mb-2">
        What Can I Make?
      </h1>
      <p class="text-neutral-500 dark:text-neutral-400">
        Take a photo of your ingredients and we'll suggest recipes you can make
      </p>
    </div>

    <!-- Upload Area -->
    <div
      v-if="!imagePreview"
      class="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl p-12 text-center cursor-pointer hover:border-primary-500 transition-colors"
      @click="selectImage"
      @drop="handleDrop"
      @dragover="handleDragOver"
    >
      <input
        ref="fileInputRef"
        type="file"
        accept="image/*"
        capture="environment"
        class="hidden"
        @change="handleFileSelect"
      >
      <UIcon
        name="i-heroicons-camera"
        class="w-16 h-16 text-neutral-400 mx-auto mb-4"
      />
      <p class="text-lg font-medium text-neutral-700 dark:text-neutral-100 mb-2">
        Take a photo or upload an image
      </p>
      <p class="text-sm text-neutral-500 dark:text-neutral-400">
        Snap a picture of your ingredients or drag and drop an image here
      </p>
    </div>

    <!-- Image Preview -->
    <div
      v-else
      class="space-y-4"
    >
      <div class="relative">
        <img
          :src="imagePreview"
          alt="Uploaded ingredients"
          class="w-full max-h-96 object-contain rounded-xl bg-neutral-100 dark:bg-neutral-800"
        >
        <button
          class="absolute top-2 right-2 p-2 bg-white dark:bg-neutral-800 rounded-full shadow-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          @click="clearImage"
        >
          <UIcon
            name="i-heroicons-x-mark"
            class="w-5 h-5 text-neutral-600 dark:text-neutral-400"
          />
        </button>
      </div>

      <div class="flex gap-2 justify-center">
        <UButton
          color="primary"
          size="lg"
          :loading="analyzing"
          @click="analyzeImage"
        >
          <UIcon
            name="i-heroicons-sparkles"
            class="w-5 h-5 mr-2"
          />
          Find Recipes
        </UButton>
        <UButton
          color="neutral"
          variant="outline"
          size="lg"
          @click="clearImage"
        >
          Choose Different Image
        </UButton>
      </div>
    </div>

    <!-- Error -->
    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      :title="error"
      class="mt-6"
      icon="i-heroicons-exclamation-circle"
    />

    <!-- Results -->
    <div
      v-if="result"
      class="mt-8 space-y-8"
    >
      <!-- Identified Ingredients -->
      <div class="bg-neutral-100 dark:bg-neutral-800 rounded-xl p-6">
        <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100 mb-4">
          <UIcon
            name="i-heroicons-check-circle"
            class="w-5 h-5 inline mr-2 text-green-500"
          />
          Ingredients Found ({{ result.identifiedIngredients.length }})
        </h2>
        <div class="flex flex-wrap gap-2">
          <div
            v-for="ingredient in result.identifiedIngredients"
            :key="ingredient.name"
            class="px-3 py-1 bg-white dark:bg-neutral-700 rounded-full text-sm flex items-center gap-2"
          >
            <span class="text-neutral-700 dark:text-neutral-100">
              {{ ingredient.quantity ? `${ingredient.quantity} ` : '' }}{{ ingredient.name }}
            </span>
            <span
              :class="getConfidenceColor(ingredient.confidence)"
              class="text-xs"
            >
              {{ ingredient.confidence }}
            </span>
          </div>
        </div>
      </div>

      <!-- Perfect Matches -->
      <div v-if="perfectMatches.length > 0">
        <h2 class="text-xl font-semibold text-neutral-700 dark:text-neutral-100 mb-4 flex items-center gap-2">
          <UIcon
            name="i-heroicons-star"
            class="w-6 h-6 text-yellow-500"
          />
          Perfect Matches ({{ perfectMatches.length }})
        </h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <RecipeMatchCard
            v-for="match in perfectMatches"
            :key="match.recipe.id"
            :match="match"
          />
        </div>
      </div>

      <!-- Almost There -->
      <div v-if="almostThere.length > 0">
        <h2 class="text-xl font-semibold text-neutral-700 dark:text-neutral-100 mb-4 flex items-center gap-2">
          <UIcon
            name="i-heroicons-hand-thumb-up"
            class="w-6 h-6 text-green-500"
          />
          Almost There ({{ almostThere.length }})
        </h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <RecipeMatchCard
            v-for="match in almostThere"
            :key="match.recipe.id"
            :match="match"
          />
        </div>
      </div>

      <!-- Need a Few More -->
      <div v-if="needAFew.length > 0">
        <h2 class="text-xl font-semibold text-neutral-700 dark:text-neutral-100 mb-4 flex items-center gap-2">
          <UIcon
            name="i-heroicons-shopping-cart"
            class="w-6 h-6 text-orange-500"
          />
          Need a Few More ({{ needAFew.length }})
        </h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <RecipeMatchCard
            v-for="match in needAFew"
            :key="match.recipe.id"
            :match="match"
          />
        </div>
      </div>

      <!-- No Matches -->
      <div
        v-if="result.recipes.length === 0"
        class="text-center py-12 bg-neutral-100 dark:bg-neutral-800 rounded-xl"
      >
        <UIcon
          name="i-heroicons-face-frown"
          class="w-12 h-12 text-neutral-400 mx-auto mb-4"
        />
        <p class="text-neutral-500 dark:text-neutral-400 mb-2">
          No matching recipes found
        </p>
        <p class="text-sm text-neutral-400">
          Try adding more recipes to your collection or explore public recipes
        </p>
        <UButton
          to="/recipes"
          class="mt-4"
          color="primary"
        >
          Browse Recipes
        </UButton>
      </div>
    </div>
  </div>
</template>
