<script setup lang="ts">
import type { CollectionWithRecipes, RecipeWithAuthor } from '~/services/collectionService'

definePageMeta({
  middleware: 'auth',
})

const route = useRoute()
const collectionSlug = computed(() => route.params.slug as string)
const { user } = useAuth()
const { getRecipeUrl } = useRecipeUrl()
const collectionService = useCollectionService()

// Data state
const collectionData = ref<CollectionWithRecipes | null>(null)
const isOwner = ref(false)

const {
  data,
  status,
  refresh,
} = await useAsyncData(
  `collection-${collectionSlug.value}`,
  async () => {
    // First we need to get the user's username to find the collection by slug
    // For user's own collection view, we use their username
    if (!user.value?.username) {
      throw new Error('Not authenticated')
    }
    const result = await collectionService.getCollectionBySlug(user.value.username, collectionSlug.value)
    if (result.error) {
      throw result.error
    }
    if (result.data) {
      collectionData.value = result.data
      isOwner.value = user.value?.id === result.data.user_id
    }
    return result.data
  },
  { watch: [collectionSlug] }
)

useSeoMeta({
  title: computed(() => data.value?.name || 'Cookbook'),
  description: computed(
    () => data.value?.description || 'Recipe cookbook'
  ),
})

// Add recipe modal
const addModalOpen = ref(false)

const existingRecipeIds = computed(() => {
  return data.value?.recipes.map((r: RecipeWithAuthor) => r.id) ?? []
})

function handleRecipesAdded(): void {
  refresh()
}

// Remove recipe handling
const recipeToRemove = ref<RecipeWithAuthor | null>(null)
const removing = ref(false)

async function handleRemoveRecipe(): Promise<void> {
  if (!recipeToRemove.value || !data.value) return

  removing.value = true
  try {
    const { error } = await collectionService.removeRecipeFromCollection(
      data.value.id,
      recipeToRemove.value.id
    )
    if (error) {
      console.error('Failed to remove recipe:', error)
    } else {
      recipeToRemove.value = null
      refresh()
    }
  } catch (err) {
    console.error('Failed to remove recipe:', err)
  }
  removing.value = false
}

const removeModalOpen = computed({
  get: () => recipeToRemove.value !== null,
  set: (val: boolean) => {
    if (!val) recipeToRemove.value = null
  },
})

function formatTime(minutes: number | null): string {
  if (!minutes) return ''
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins ? `${hours}h ${mins}m` : `${hours}h`
}

function getTotalTime(recipe: RecipeWithAuthor): string {
  const total = (recipe.prep_time || 0) + (recipe.cook_time || 0)
  return formatTime(total)
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
    <!-- Loading -->
    <div
      v-if="status === 'pending'"
      class="space-y-4"
    >
      <div class="h-56 rounded-xl animate-shimmer -mx-4 sm:-mx-6 -mt-8" />
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
        <div
          v-for="i in 4"
          :key="i"
          class="h-48 rounded-lg animate-shimmer"
        />
      </div>
    </div>

    <!-- Error -->
    <div
      v-else-if="!data"
      class="text-center py-16"
    >
      <div
        class="w-16 h-16 mx-auto mb-4 rounded-full bg-error-100 dark:bg-error-900/30 flex items-center justify-center"
      >
        <UIcon
          name="i-heroicons-exclamation-triangle"
          class="w-8 h-8 text-error-500"
        />
      </div>
      <h2 class="text-xl font-display text-neutral-700 dark:text-neutral-100 mb-2">
        Cookbook Not Found
      </h2>
      <p class="text-neutral-500 dark:text-neutral-400 mb-6">
        This cookbook doesn't exist or you don't have access.
      </p>
      <UButton
        to="/collections"
        color="primary"
        class="press-effect"
      >
        Back to Cookbooks
      </UButton>
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Header -->
      <CollectionsCollectionHeader
        :collection="data!"
        :recipe-count="data!.recipes.length"
        :is-owner="isOwner"
        :use-slug="true"
      />

      <!-- Actions bar -->
      <div
        v-if="isOwner"
        class="flex items-center justify-between mb-6"
      >
        <p class="text-neutral-500 dark:text-neutral-400">
          {{ data.recipes.length }}
          {{ data.recipes.length === 1 ? 'recipe' : 'recipes' }}
        </p>
        <UButton
          color="primary"
          variant="soft"
          icon="i-heroicons-plus"
          @click="addModalOpen = true"
        >
          Add Recipes
        </UButton>
      </div>

      <!-- Empty State -->
      <div
        v-if="data.recipes.length === 0"
        class="text-center py-16 bg-neutral-100 dark:bg-neutral-800 rounded-xl"
      >
        <div
          class="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center"
        >
          <UIcon
            name="i-heroicons-book-open"
            class="w-8 h-8 text-neutral-400"
          />
        </div>
        <h2 class="text-xl font-display text-neutral-700 dark:text-neutral-100 mb-2">
          No recipes yet
        </h2>
        <p class="text-neutral-500 dark:text-neutral-400 mb-6">
          Add your favorite recipes to this cookbook
        </p>
        <UButton
          v-if="isOwner"
          color="primary"
          class="press-effect"
          @click="addModalOpen = true"
        >
          Add Recipes
        </UButton>
        <UButton
          v-else
          to="/browse"
          color="primary"
          class="press-effect"
        >
          Browse Recipes
        </UButton>
      </div>

      <!-- Recipes Grid -->
      <div
        v-else
        class="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-stagger"
      >
        <div
          v-for="recipe in data.recipes"
          :key="recipe.id"
          class="group relative"
        >
          <NuxtLink :to="getRecipeUrl(recipe)">
            <div
              class="h-full bg-white dark:bg-neutral-800 rounded-xl overflow-hidden hover-lift transition-all shadow-sm hover:shadow-md"
            >
              <!-- Cover Image -->
              <div class="h-32 relative overflow-hidden">
                <img
                  v-if="recipe.cover_photo"
                  :src="recipe.cover_photo"
                  :alt="recipe.title"
                  class="w-full h-full object-cover"
                >
                <div
                  v-else
                  class="w-full h-full bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-700 dark:to-neutral-800 flex items-center justify-center"
                >
                  <UIcon
                    name="i-heroicons-photo"
                    class="w-10 h-10 text-neutral-400"
                  />
                </div>
              </div>

              <div class="p-4">
                <h3
                  class="font-semibold text-neutral-700 dark:text-neutral-100 line-clamp-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors"
                >
                  {{ recipe.title }}
                </h3>
                <p
                  v-if="recipe.description"
                  class="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-1"
                >
                  {{ recipe.description }}
                </p>
                <div
                  class="flex items-center gap-4 text-sm text-neutral-400 dark:text-neutral-500 mt-3"
                >
                  <span
                    v-if="getTotalTime(recipe)"
                    class="flex items-center gap-1"
                  >
                    <UIcon
                      name="i-heroicons-clock"
                      class="w-4 h-4"
                    />
                    {{ getTotalTime(recipe) }}
                  </span>
                  <span class="flex items-center gap-1">
                    <UIcon
                      name="i-heroicons-users"
                      class="w-4 h-4"
                    />
                    {{ recipe.servings }} servings
                  </span>
                </div>
              </div>
            </div>
          </NuxtLink>

          <!-- Remove Button -->
          <UButton
            v-if="isOwner"
            color="error"
            variant="solid"
            icon="i-heroicons-x-mark"
            size="xs"
            class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity shadow"
            @click="recipeToRemove = recipe"
          />
        </div>
      </div>
    </template>

    <!-- Add Recipe Modal -->
    <CollectionsAddRecipeModal
      v-if="isOwner"
      v-model:open="addModalOpen"
      :collection-id="data?.id"
      :existing-recipe-ids="existingRecipeIds"
      @added="handleRecipesAdded"
    />

    <!-- Remove Recipe Modal -->
    <UModal
      v-model:open="removeModalOpen"
      title="Remove Recipe"
      description="Confirm removal of recipe from cookbook"
    >
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-full bg-error-100 dark:bg-error-900/30 flex items-center justify-center"
              >
                <UIcon
                  name="i-heroicons-minus-circle"
                  class="w-5 h-5 text-error-600 dark:text-error-400"
                />
              </div>
              <h3 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">
                Remove Recipe
              </h3>
            </div>
          </template>
          <p class="text-neutral-600 dark:text-neutral-300">
            Remove "<strong>{{ recipeToRemove?.title }}</strong>" from this
            cookbook?
          </p>
          <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
            The recipe won't be deleted, just removed from this cookbook.
          </p>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton
                color="neutral"
                variant="outline"
                @click="recipeToRemove = null"
              >
                Cancel
              </UButton>
              <UButton
                color="error"
                variant="solid"
                :loading="removing"
                class="press-effect"
                @click="handleRemoveRecipe"
              >
                Remove
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
