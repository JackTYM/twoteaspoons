<script setup lang="ts">
import RecipeEditor from '~/components/recipe-editor/RecipeEditor.vue'

definePageMeta({
  middleware: 'auth',
})

useSeoMeta({
  title: 'New Recipe',
  description: 'Create a new recipe',
})

const recipeService = useRecipeService()
const { user } = useAuth()
const { getRecipeUrl } = useRecipeUrl()
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
  ingredients: Array<{ amount: string; unit: string; item: string; notes: string }>
  instructions: Array<{ content: string; timerMinutes: number | null; ingredientLinks: IngredientLink[] }>
}

async function handleSubmit(data: FormData): Promise<void> {
  loading.value = true
  error.value = ''

  try {
    const recipe = await recipeService.createRecipe({
      title: data.title,
      description: data.description || null,
      cover_photo: data.coverPhoto || null,
      prep_time: data.prepTime,
      cook_time: data.cookTime,
      servings: data.servings,
      is_published: data.isPublished,
      source_url: data.sourceUrl || null,
      source_author: data.sourceAuthor || null,
      source_site: data.sourceSite || null,
      ingredients: data.ingredients,
      instructions: data.instructions.map(inst => ({
        content: inst.content,
        timer_minutes: inst.timerMinutes,
        ingredient_ids: inst.ingredientLinks?.length ? JSON.stringify(inst.ingredientLinks.map(l => l.id)) : null,
      })),
      category_ids: [],
    })
    if (recipe) {
      navigateTo(getRecipeUrl({
        slug: recipe.slug,
        author: { username: user.value?.username || null },
      }))
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to create recipe'
  }

  loading.value = false
}
</script>

<template>
  <div class="px-4 sm:px-6 py-8">
    <!-- Breadcrumbs -->
    <div class="max-w-6xl mx-auto mb-6">
      <Breadcrumbs
        :items="[
          { label: 'Browse', to: '/browse', icon: 'i-heroicons-magnifying-glass' },
          { label: 'New Recipe' },
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
      submit-label="Create Recipe"
      :loading="loading"
      autosave-key="recipe-new"
      mode="create"
      @submit="handleSubmit"
    />
  </div>
</template>
