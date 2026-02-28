<script setup lang="ts">
import type { RecipeWithRelations } from '~/types/recipe'

definePageMeta({
  middleware: 'auth',
})

const route = useRoute()
const id = computed(() => route.params.id as string)

const { data, status, error: fetchError } = await useFetch<{ recipe: RecipeWithRelations }>(`/api/recipes/${id.value}`)

const recipe = computed(() => data.value?.recipe)

watchEffect(() => {
  if (recipe.value) {
    useSeoMeta({
      title: `Edit: ${recipe.value.title}`,
    })
  }
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

async function handleSubmit(formData: FormData): Promise<void> {
  loading.value = true
  error.value = ''

  try {
    await $fetch(`/api/recipes/${id.value}`, {
      method: 'PUT',
      body: formData,
    })
    navigateTo(`/recipes/${id.value}`)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to update recipe'
  }

  loading.value = false
}
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 py-8">
    <!-- Loading -->
    <div v-if="status === 'pending'">
      <USkeleton class="h-10 w-1/2 mb-8" />
      <USkeleton class="h-96" />
    </div>

    <!-- Error -->
    <UAlert
      v-else-if="fetchError"
      color="error"
      variant="soft"
      title="Recipe not found"
      icon="i-heroicons-exclamation-circle"
    />

    <!-- Form -->
    <template v-else-if="recipe">
      <h1 class="text-3xl font-bold text-neutral-700 dark:text-neutral-50 mb-8">
        Edit Recipe
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
        :initial-data="{
          title: recipe.title,
          description: recipe.description || undefined,
          coverPhoto: recipe.coverPhoto || undefined,
          prepTime: recipe.prepTime || undefined,
          cookTime: recipe.cookTime || undefined,
          servings: recipe.servings || undefined,
          sourceUrl: recipe.sourceUrl || undefined,
          sourceAuthor: recipe.sourceAuthor || undefined,
          sourceSite: recipe.sourceSite || undefined,
          ingredients: recipe.ingredients.map(i => ({
            amount: i.amount || undefined,
            unit: i.unit || undefined,
            item: i.item,
            notes: i.notes || undefined,
          })),
          instructions: recipe.instructions.map(i => ({
            content: i.content,
            timerMinutes: i.timerMinutes || undefined,
          })),
        }"
        submit-label="Save Changes"
        :loading="loading"
        @submit="handleSubmit"
      />
    </template>
  </div>
</template>
