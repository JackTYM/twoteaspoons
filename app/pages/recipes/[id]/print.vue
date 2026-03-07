<script setup lang="ts">
import type { RecipeWithRelations } from '~/types/recipe'

/**
 * Legacy route - redirects to new username/slug URL pattern.
 * Kept for backwards compatibility with existing bookmarks.
 */
definePageMeta({
  layout: false,
})

const route = useRoute()
const id = computed(() => route.params.id as string)
const format = route.query.format as string | undefined
const { getAuthHeaders } = useAuth()
const { getRecipePrintUrl } = useRecipeUrl()

// Fetch recipe to get slug and username for redirect
const { data, error } = await useFetch<{ recipe: RecipeWithRelations }>(
  `/api/recipes/${id.value}`,
  {
    headers: getAuthHeaders(),
  }
)

// Redirect to new URL if recipe found
watchEffect(() => {
  if (data.value?.recipe) {
    let newUrl = getRecipePrintUrl(data.value.recipe)
    // Preserve format query param
    if (format) {
      newUrl += `?format=${format}`
    }
    navigateTo(newUrl, { replace: true, redirectCode: 301 })
  }
})
</script>

<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
    <!-- Loading State while fetching for redirect -->
    <div v-if="!error" class="text-center">
      <UIcon
        name="i-heroicons-arrow-path"
        class="w-10 h-10 animate-spin text-primary-500 mx-auto mb-4"
      />
      <p class="text-neutral-500">Redirecting...</p>
    </div>

    <!-- Error -->
    <div v-else class="text-center">
      <div
        class="w-16 h-16 mx-auto bg-error-100 dark:bg-error-900/50 rounded-full flex items-center justify-center mb-4"
      >
        <UIcon
          name="i-heroicons-exclamation-triangle"
          class="w-8 h-8 text-error-600 dark:text-error-400"
        />
      </div>
      <p class="text-xl mb-4 text-neutral-700 dark:text-neutral-100">
        Recipe not found
      </p>
      <UButton to="/browse" color="primary"> Go Back </UButton>
    </div>
  </div>
</template>
