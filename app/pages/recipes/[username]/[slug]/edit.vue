<script setup lang="ts">
import type { RecipeWithRelations } from '~/types/recipe'
import RecipeEditor from '~/components/recipe-editor/RecipeEditor.vue'

definePageMeta({
  middleware: 'auth',
})

const route = useRoute()
const username = computed(() => route.params.username as string)
const slug = computed(() => route.params.slug as string)
const { getAuthHeaders } = useAuth()
const { getRecipeUrl } = useRecipeUrl()

const {
  data,
  status,
  error: fetchError,
} = await useFetch<{ recipe: RecipeWithRelations }>(
  `/api/recipes/${username.value}/${slug.value}`,
  {
    headers: getAuthHeaders(),
  }
)

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

interface IngredientLink {
  id: number
  amount?: string | null
  unit?: string | null
}

interface FormData {
  title: string
  description: string
  coverPhoto: string
  prepTime: number | null
  cookTime: number | null
  servings: number
  isPublished: boolean
  sourceUrl: string
  sourceAuthor: string
  sourceSite: string
  ingredients: Array<{
    amount: string
    unit: string
    item: string
    notes: string
  }>
  instructions: Array<{ content: string; timerMinutes: number | null; ingredientLinks: IngredientLink[] }>
}

async function handleSubmit(formData: FormData): Promise<void> {
  loading.value = true
  error.value = ''

  try {
    const result = await $fetch<{
      recipe: RecipeWithRelations
      slugChanged: boolean
      newSlug: string
    }>(`/api/recipes/${username.value}/${slug.value}`, {
      method: 'PUT',
      body: formData,
      headers: getAuthHeaders(),
    })

    // Navigate to the recipe page (which may have a new slug if title changed)
    navigateTo(getRecipeUrl(result.recipe))
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to update recipe'
  }

  loading.value = false
}
</script>

<template>
  <div class="px-4 sm:px-6 py-8">
    <!-- Loading -->
    <div
      v-if="status === 'pending'"
      class="max-w-6xl mx-auto"
    >
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
      class="max-w-6xl mx-auto"
    />

    <!-- Editor -->
    <template v-else-if="recipe">
      <!-- Breadcrumbs -->
      <div class="max-w-6xl mx-auto mb-6">
        <Breadcrumbs
          :items="[
            { label: 'Browse', to: '/browse', icon: 'i-heroicons-magnifying-glass' },
            { label: recipe.title, to: getRecipeUrl(recipe) },
            { label: 'Edit' },
          ]"
        />
      </div>

      <UAlert
        v-if="error"
        color="error"
        variant="soft"
        :title="error"
        icon="i-heroicons-exclamation-circle"
        class="max-w-6xl mx-auto mb-6"
      />

      <RecipeEditor
        :initial-data="{
          title: recipe.title,
          description: recipe.description || undefined,
          coverPhoto: recipe.coverPhoto || undefined,
          prepTime: recipe.prepTime || undefined,
          cookTime: recipe.cookTime || undefined,
          servings: recipe.servings || undefined,
          isPublished: recipe.isPublished ?? true,
          sourceUrl: recipe.sourceUrl || undefined,
          sourceAuthor: recipe.sourceAuthor || undefined,
          sourceSite: recipe.sourceSite || undefined,
          categories: recipe.categories,
          ingredients: recipe.ingredients.map((i) => ({
            id: i.id,
            amount: i.amount || undefined,
            unit: i.unit || undefined,
            item: i.item,
            notes: i.notes || undefined,
          })),
          instructions: recipe.instructions.map((i) => ({
            id: i.id,
            content: i.content,
            timerMinutes: i.timerMinutes || undefined,
            // Support both old ingredientIds and new ingredientLinks formats
            ingredientIds: i.ingredientIds || [],
            ingredientLinks: i.ingredientLinks || undefined,
          })),
        }"
        submit-label="Save Changes"
        :loading="loading"
        :autosave-key="`recipe-edit-${recipe.id}`"
        mode="edit"
        @submit="handleSubmit"
      />
    </template>
  </div>
</template>
