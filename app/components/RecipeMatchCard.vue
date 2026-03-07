<script setup lang="ts">
defineProps<{
  match: RecipeMatch
}>()

const { getRecipeUrl } = useRecipeUrl()

interface RecipeMatch {
  recipe: {
    id: number
    slug: string
    title: string
    coverPhoto: string | null
    prepTime: number | null
    cookTime: number | null
    author?: { username: string | null } | null
  }
  matchPercentage: number
  missingIngredients: string[]
  matchedIngredients: string[]
}

function formatTime(minutes: number | null): string {
  if (!minutes) return ''
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins ? `${hours}h ${mins}m` : `${hours}h`
}

function getMatchColor(percentage: number): string {
  if (percentage >= 80) return 'bg-green-500'
  if (percentage >= 50) return 'bg-yellow-500'
  return 'bg-orange-500'
}
</script>

<template>
  <NuxtLink
    :to="getRecipeUrl(match.recipe)"
    class="block bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden hover:border-primary-500 hover:-translate-y-1 transition-all"
  >
    <!-- Image -->
    <div class="relative h-32 bg-neutral-200 dark:bg-neutral-700">
      <img
        v-if="match.recipe.coverPhoto"
        :src="match.recipe.coverPhoto"
        :alt="match.recipe.title"
        class="w-full h-full object-cover"
      >
      <div
        v-else
        class="w-full h-full flex items-center justify-center"
      >
        <UIcon
          name="i-heroicons-photo"
          class="w-12 h-12 text-neutral-400"
        />
      </div>

      <!-- Match Percentage Badge -->
      <div
        class="absolute top-2 right-2 px-2 py-1 rounded-full text-white text-sm font-semibold"
        :class="getMatchColor(match.matchPercentage)"
      >
        {{ match.matchPercentage }}% match
      </div>
    </div>

    <!-- Content -->
    <div class="p-4">
      <h3 class="font-semibold text-neutral-700 dark:text-neutral-100 mb-2 line-clamp-1">
        {{ match.recipe.title }}
      </h3>

      <!-- Time -->
      <div
        v-if="match.recipe.prepTime || match.recipe.cookTime"
        class="text-sm text-neutral-500 dark:text-neutral-400 mb-3"
      >
        <UIcon
          name="i-heroicons-clock"
          class="w-4 h-4 inline mr-1"
        />
        {{ formatTime((match.recipe.prepTime || 0) + (match.recipe.cookTime || 0)) }}
      </div>

      <!-- Missing Ingredients -->
      <div
        v-if="match.missingIngredients.length > 0"
        class="text-sm"
      >
        <span class="text-neutral-500 dark:text-neutral-400">Missing: </span>
        <span class="text-orange-600 dark:text-orange-400">
          {{ match.missingIngredients.slice(0, 3).join(', ') }}
          <template v-if="match.missingIngredients.length > 3">
            +{{ match.missingIngredients.length - 3 }} more
          </template>
        </span>
      </div>

      <!-- All Ingredients Available -->
      <div
        v-else
        class="text-sm text-green-600 dark:text-green-400"
      >
        <UIcon
          name="i-heroicons-check-circle"
          class="w-4 h-4 inline mr-1"
        />
        You have all ingredients!
      </div>
    </div>
  </NuxtLink>
</template>
