<script setup lang="ts">
import CollectionEditor from '~/components/collection-editor/CollectionEditor.vue'
import type { CollectionWithRecipes, RecipeWithAuthor } from '~/services/collectionService'
import { generateSlug } from '~/utils/slug'

definePageMeta({
  middleware: 'auth',
})

const route = useRoute()
const collectionSlug = computed(() => route.params.slug as string)
const { user } = useAuth()
const collectionService = useCollectionService()

interface EditorRecipe {
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
  recipes: EditorRecipe[]
}

// Track ownership
const isOwner = ref(false)

const {
  data,
  status,
  error: fetchError,
  refresh,
} = await useAsyncData<CollectionWithRecipes | null>(
  `collection-edit-${collectionSlug.value}`,
  async () => {
    if (!user.value?.username) {
      throw new Error('Not authenticated')
    }
    const result = await collectionService.getCollectionBySlug(user.value.username, collectionSlug.value)
    if (result.error) {
      throw result.error
    }
    if (result.data) {
      isOwner.value = user.value?.id === result.data.user_id
    }
    return result.data
  },
  { watch: [collectionSlug] }
)

// Redirect if not owner
watchEffect(() => {
  if (data.value && !isOwner.value) {
    navigateTo(`/collections/${collectionSlug.value}`)
  }
})

useSeoMeta({
  title: computed(() =>
    data.value ? `Edit: ${data.value.name}` : 'Edit Cookbook'
  ),
})

const loading = ref(false)
const error = ref('')
const editorRef = ref<InstanceType<typeof CollectionEditor> | null>(null)

// Local recipes state (for tracking changes before save)
const localRecipes = ref<EditorRecipe[]>([])

// Transform RecipeWithAuthor to EditorRecipe format
function toEditorRecipe(r: RecipeWithAuthor): EditorRecipe {
  return {
    id: r.id,
    title: r.title,
    coverPhoto: r.cover_photo,
    prepTime: r.prep_time,
    cookTime: r.cook_time,
  }
}

watchEffect(() => {
  if (data.value?.recipes) {
    localRecipes.value = data.value.recipes.map(toEditorRecipe)
  }
})

async function handleSubmit(formData: FormData): Promise<void> {
  if (!formData.name.trim() || !data.value) {
    error.value = 'Name is required'
    return
  }

  loading.value = true
  error.value = ''

  try {
    // Generate new slug if name changed
    const newSlug = generateSlug(formData.name.trim())
    const slugChanged = newSlug !== data.value.slug

    // Update collection metadata using service
    const { data: updatedCollection, error: updateError } = await collectionService.updateCollection(
      data.value.id,
      {
        name: formData.name.trim(),
        slug: newSlug,
        description: formData.description.trim() || null,
        is_public: formData.isPublic,
        cover_photo: formData.coverPhoto || null,
      }
    )

    if (updateError || !updatedCollection) {
      throw updateError || new Error('Failed to update collection')
    }

    // Update recipe order using service
    if (formData.recipes.length > 0) {
      const recipeIds = formData.recipes.map(r => r.id)
      const { error: reorderError } = await collectionService.reorderCollectionRecipes(
        data.value.id,
        recipeIds
      )
      if (reorderError) {
        console.error('Failed to reorder recipes:', reorderError)
      }
    }

    // Clear draft on successful save
    editorRef.value?.clearDraft()
    // Navigate to the new slug if it changed
    const targetSlug = slugChanged ? updatedCollection.slug : collectionSlug.value
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
  if (!recipeIds || recipeIds.length === 0 || !data.value) return

  // Add recipes to the collection using service
  try {
    for (const recipeId of recipeIds) {
      await collectionService.addRecipeToCollection(data.value.id, recipeId)
    }

    // Refresh data
    await refresh()

    // Update local state
    if (data.value?.recipes) {
      localRecipes.value = data.value.recipes.map(toEditorRecipe)
      editorRef.value?.updateRecipes(localRecipes.value)
    }
  } catch (err) {
    console.error('Failed to add recipes:', err)
  }

  addModalOpen.value = false
}

async function handleRemoveRecipe(recipeId: number): Promise<void> {
  if (!data.value) return

  try {
    const { error: removeError } = await collectionService.removeRecipeFromCollection(
      data.value.id,
      recipeId
    )
    if (removeError) {
      console.error('Failed to remove recipe:', removeError)
      return
    }

    // Update local state
    localRecipes.value = localRecipes.value.filter((r) => r.id !== recipeId)
    editorRef.value?.updateRecipes(localRecipes.value)
  } catch (err) {
    console.error('Failed to remove recipe:', err)
  }
}

function handleReorderRecipes(recipes: EditorRecipe[]): void {
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
    <template v-else-if="data">
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
          id: data.id,
          name: data.name,
          description: data.description || '',
          coverPhoto: data.cover_photo || '',
          isPublic: data.is_public,
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
        :collection-id="data.id"
        :existing-recipe-ids="localRecipes.map((r) => r.id)"
        @added="handleRecipesSelected"
      />
    </template>
  </div>
</template>
