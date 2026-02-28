<script setup lang="ts">
useSeoMeta({
  title: 'New Recipe',
  description: 'Create a new recipe',
})

const loading = ref(false)
const error = ref('')

interface FormData {
  title: string
  description: string
  coverPhoto: string
  prepTime: number | null
  cookTime: number | null
  servings: number
  sourceUrl: string
  sourceAuthor: string
  sourceSite: string
  ingredients: Array<{ amount: string; unit: string; item: string; notes: string }>
  instructions: Array<{ content: string; timerMinutes: number | null }>
}

async function handleSubmit(data: FormData): Promise<void> {
  loading.value = true
  error.value = ''

  try {
    const result = await $fetch<{ recipe: { id: number } }>('/api/recipes', {
      method: 'POST',
      body: data,
    })
    navigateTo(`/recipes/${result.recipe.id}`)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to create recipe'
  }

  loading.value = false
}
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 py-8">
    <h1 class="text-3xl font-bold text-neutral-700 dark:text-neutral-50 mb-8">
      New Recipe
    </h1>

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      :title="error"
      icon="i-heroicons-exclamation-circle"
      class="mb-6"
    />

    <RecipeForm
      submit-label="Create Recipe"
      :loading="loading"
      @submit="handleSubmit"
    />
  </div>
</template>
