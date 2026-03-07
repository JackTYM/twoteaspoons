<script setup lang="ts">
import CollectionEditor from '~/components/collection-editor/CollectionEditor.vue'

definePageMeta({
  middleware: 'auth',
})

useSeoMeta({
  title: 'New Collection',
  description: 'Create a new recipe collection',
})

const route = useRoute()
const { getAuthHeaders } = useAuth()
const loading = ref(false)
const error = ref('')
const initialRecipeId = route.query.recipeId as string | undefined

interface Recipe {
  id: number
  title: string
  coverPhoto: string | null
  prepTime: number | null
  cookTime: number | null
}

interface FormData {
  name: string
  description: string
  coverPhoto: string
  isPublic: boolean
  recipes: Recipe[]
}

async function handleSubmit(data: FormData): Promise<void> {
  if (!data.name.trim()) {
    error.value = 'Name is required'
    return
  }

  loading.value = true
  error.value = ''

  try {
    // Create the collection
    const result = await $fetch<{ collection: { id: number; slug: string } }>('/api/collections', {
      method: 'POST',
      body: {
        name: data.name.trim(),
        description: data.description.trim() || undefined,
        isPublic: data.isPublic,
        coverPhoto: data.coverPhoto || undefined,
      },
      headers: getAuthHeaders(),
    })

    // If recipes were added, add them to the collection
    if (data.recipes.length > 0) {
      await $fetch(`/api/collections/by-id/${result.collection.id}/recipes`, {
        method: 'POST',
        body: {
          recipeIds: data.recipes.map(r => r.id),
        },
        headers: getAuthHeaders(),
      })
    }

    // Clear draft only on successful creation
    editorRef.value?.clearDraft()
    navigateTo(`/collections/${result.collection.slug}`)
  } catch (err) {
    console.error('Failed to create collection:', err)
    error.value = 'Failed to create collection'
    loading.value = false
  }
}

// Add recipes modal
const addModalOpen = ref(false)
const editorRef = ref<InstanceType<typeof CollectionEditor> | null>(null)
const tempRecipes = ref<Recipe[]>([])

function handleAddRecipes(): void {
  addModalOpen.value = true
}

// When recipes are selected from the modal
async function handleRecipesSelected(recipeIds?: number[]): Promise<void> {
  if (!recipeIds || recipeIds.length === 0) return
  // Fetch recipe details for the selected recipes
  const newRecipes: Recipe[] = []

  for (const recipeId of recipeIds) {
    // Skip if already in the list
    if (tempRecipes.value.some(r => r.id === recipeId)) continue

    try {
      const result = await $fetch<{ recipe: Recipe }>(`/api/recipes/by-id/${recipeId}`, {
        headers: getAuthHeaders(),
      })
      if (result.recipe) {
        newRecipes.push({
          id: result.recipe.id,
          title: result.recipe.title,
          coverPhoto: result.recipe.coverPhoto,
          prepTime: result.recipe.prepTime,
          cookTime: result.recipe.cookTime,
        })
      }
    } catch {
      // Skip if fetch fails
    }
  }

  tempRecipes.value = [...tempRecipes.value, ...newRecipes]
  editorRef.value?.updateRecipes(tempRecipes.value)
  addModalOpen.value = false
}

function handleRemoveRecipe(recipeId: number): void {
  tempRecipes.value = tempRecipes.value.filter(r => r.id !== recipeId)
  editorRef.value?.updateRecipes(tempRecipes.value)
}

function handleReorderRecipes(recipes: Recipe[]): void {
  tempRecipes.value = recipes
}

// Pre-populate recipe if recipeId query param is present
onMounted(async () => {
  if (initialRecipeId) {
    try {
      const result = await $fetch<{ recipe: Recipe }>(`/api/recipes/by-id/${initialRecipeId}`, {
        headers: getAuthHeaders(),
      })
      if (result.recipe) {
        tempRecipes.value = [{
          id: result.recipe.id,
          title: result.recipe.title,
          coverPhoto: result.recipe.coverPhoto,
          prepTime: result.recipe.prepTime,
          cookTime: result.recipe.cookTime,
        }]
        editorRef.value?.updateRecipes(tempRecipes.value)
      }
    } catch {
      // Ignore - recipe may not exist
    }
  }
})
</script>

<template>
  <div class="px-4 sm:px-6 py-8">
    <!-- Breadcrumbs -->
    <div class="max-w-6xl mx-auto mb-6">
      <Breadcrumbs
        :items="[
          { label: 'Collections', to: '/collections', icon: 'i-heroicons-folder' },
          { label: 'New Collection' },
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

    <CollectionEditor
      ref="editorRef"
      :initial-data="{ recipes: tempRecipes }"
      submit-label="Create Collection"
      :loading="loading"
      autosave-key="collection-new"
      mode="create"
      @submit="handleSubmit"
      @add-recipes="handleAddRecipes"
      @remove-recipe="handleRemoveRecipe"
      @reorder-recipes="handleReorderRecipes"
    />

    <!-- Add Recipe Modal (reuse existing) -->
    <CollectionsAddRecipeModal
      v-model:open="addModalOpen"
      :collection-id="0"
      :existing-recipe-ids="tempRecipes.map(r => r.id)"
      @added="handleRecipesSelected"
    />
  </div>
</template>
