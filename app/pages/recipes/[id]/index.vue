<script setup lang="ts">
import { transformToRecipeWithRelations } from '~/utils/transformCase'

/**
 * Legacy route - redirects to new username/slug URL pattern.
 * Kept for backwards compatibility with existing bookmarks.
 */
const route = useRoute()
const id = computed(() => route.params.id as string)
const { getRecipeUrl } = useRecipeUrl()

// Services
const recipeService = useRecipeService()

// Fetch recipe to get slug and username for redirect
const { data, error } = await useAsyncData(
  `recipe-id-${id.value}`,
  async () => {
    const recipeData = await recipeService.getRecipeById(parseInt(id.value, 10))
    if (!recipeData) {
      throw createError({ statusCode: 404, message: 'Recipe not found' })
    }
    return { recipe: transformToRecipeWithRelations(recipeData) }
  }
)

// Redirect to new URL if recipe found
watchEffect(() => {
  if (data.value?.recipe) {
    const newUrl = getRecipeUrl(data.value.recipe)
    navigateTo(newUrl, { replace: true, redirectCode: 301 })
  }
})
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 sm:px-6 py-8">
    <!-- Loading State while fetching for redirect -->
    <div v-if="!error" class="flex items-center justify-center py-20">
      <UIcon
        name="i-heroicons-arrow-path"
        class="w-8 h-8 animate-spin text-primary-500"
      />
      <span class="ml-3 text-neutral-500">Redirecting...</span>
    </div>

    <!-- Error State -->
    <EmptyState
      v-else
      icon="i-heroicons-exclamation-circle"
      title="Recipe not found"
      description="This recipe doesn't exist or has been deleted."
    >
      <UButton to="/browse" color="primary" icon="i-heroicons-arrow-left">
        Back to recipes
      </UButton>
    </EmptyState>
  </div>
</template>
