<script setup lang="ts">
import CollectionEditor from '~/components/collection-editor/CollectionEditor.vue'

definePageMeta({
  middleware: 'auth',
})

const route = useRoute()
const collectionSlug = computed(() => route.params.slug as string)
const { getAuthHeaders } = useAuth()

interface Recipe {
  id: number
  title: string
  coverPhoto: string | null
  prepTime: number | null
  cookTime: number | null
}

interface Collection {
  id: number
  name: string
  slug: string
  description: string | null
  isPublic: boolean
  coverPhoto: string | null
}

interface CollectionData {
  collection: Collection
  recipes: Recipe[]
  isOwner: boolean
}

interface FormData {
  name: string
  description: string
  coverPhoto: string
  isPublic: boolean
  recipes: Recipe[]
}

const {
  data,
  status,
  error: fetchError,
  refresh,
} = await useFetch<CollectionData>(`/api/collections/by-id/${collectionSlug.value}`, {
  headers: getAuthHeaders(),
})

// Redirect if not owner
watchEffect(() => {
  if (data.value && !data.value.isOwner) {
    navigateTo(`/collections/${collectionSlug.value}`)
  }
})

useSeoMeta({
  title: computed(() =>
    data.value ? `Edit: ${data.value.collection.name}` : 'Edit Cookbook'
  ),
})

const loading = ref(false)
const error = ref('')
const editorRef = ref<InstanceType<typeof CollectionEditor> | null>(null)

// Local recipes state (for tracking changes before save)
const localRecipes = ref<Recipe[]>([])

watchEffect(() => {
  if (data.value?.recipes) {
    localRecipes.value = data.value.recipes.map((r) => ({
      id: r.id,
      title: r.title,
      coverPhoto: r.coverPhoto,
      prepTime: r.prepTime,
      cookTime: r.cookTime,
    }))
  }
})

async function handleSubmit(formData: FormData): Promise<void> {
  if (!formData.name.trim()) {
    error.value = 'Name is required'
    return
  }

  loading.value = true
  error.value = ''

  try {
    // Update collection metadata
    const response = await $fetch<{
      collection: Collection
      slugChanged: boolean
      newSlug: string
    }>(`/api/collections/by-id/${collectionSlug.value}`, {
      method: 'PUT',
      body: {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        isPublic: formData.isPublic,
        coverPhoto: formData.coverPhoto || null,
      },
      headers: getAuthHeaders(),
    })

    // Update recipe order
    if (formData.recipes.length > 0) {
      await $fetch(`/api/collections/by-id/${collectionSlug.value}/recipes/reorder`, {
        method: 'PUT',
        body: {
          recipes: formData.recipes.map((r, index) => ({
            recipeId: r.id,
            sortOrder: index,
          })),
        },
        headers: getAuthHeaders(),
      })
    }

    // Clear draft on successful save
    editorRef.value?.clearDraft()
    // Navigate to the new slug if it changed
    const targetSlug = response.slugChanged ? response.newSlug : collectionSlug.value
    navigateTo(`/collections/${targetSlug}`)
  } catch (err) {
    console.error('Failed to update collection:', err)
    error.value = 'Failed to update collection'
    loading.value = false
  }
}

// Add recipes modal
const addModalOpen = ref(false)

function handleAddRecipes(): void {
  addModalOpen.value = true
}

async function handleRecipesSelected(recipeIds?: number[]): Promise<void> {
  if (!recipeIds || recipeIds.length === 0) return

  // Add recipes to the collection via API
  try {
    await $fetch(`/api/collections/by-id/${collectionSlug.value}/recipes`, {
      method: 'POST',
      body: { recipeIds },
      headers: getAuthHeaders(),
    })

    // Refresh data
    await refresh()

    // Update local state
    if (data.value?.recipes) {
      localRecipes.value = data.value.recipes.map((r) => ({
        id: r.id,
        title: r.title,
        coverPhoto: r.coverPhoto,
        prepTime: r.prepTime,
        cookTime: r.cookTime,
      }))
      editorRef.value?.updateRecipes(localRecipes.value)
    }
  } catch (err) {
    console.error('Failed to add recipes:', err)
  }

  addModalOpen.value = false
}

async function handleRemoveRecipe(recipeId: number): Promise<void> {
  try {
    await $fetch(`/api/collections/by-id/${collectionSlug.value}/recipes/${recipeId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })

    // Update local state
    localRecipes.value = localRecipes.value.filter((r) => r.id !== recipeId)
    editorRef.value?.updateRecipes(localRecipes.value)
  } catch (err) {
    console.error('Failed to remove recipe:', err)
  }
}

function handleReorderRecipes(recipes: Recipe[]): void {
  localRecipes.value = recipes
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
      <USkeleton class="h-64 mb-6" />
      <USkeleton class="h-96" />
    </div>

    <!-- Error -->
    <UAlert
      v-else-if="fetchError"
      color="error"
      variant="soft"
      title="Cookbook not found"
      icon="i-heroicons-exclamation-circle"
      class="max-w-6xl mx-auto"
    />

    <!-- Editor -->
    <template v-else-if="data?.collection">
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
        :initial-data="{
          id: data.collection.id,
          name: data.collection.name,
          description: data.collection.description || '',
          coverPhoto: data.collection.coverPhoto || '',
          isPublic: data.collection.isPublic,
          recipes: localRecipes,
        }"
        submit-label="Save Changes"
        :loading="loading"
        :autosave-key="`collection-edit-${collectionSlug}`"
        mode="edit"
        @submit="handleSubmit"
        @add-recipes="handleAddRecipes"
        @remove-recipe="handleRemoveRecipe"
        @reorder-recipes="handleReorderRecipes"
      />

      <!-- Add Recipe Modal -->
      <CollectionsAddRecipeModal
        v-model:open="addModalOpen"
        :collection-slug="collectionSlug"
        :existing-recipe-ids="localRecipes.map((r) => r.id)"
        @added="handleRecipesSelected"
      />
    </template>
  </div>
</template>
