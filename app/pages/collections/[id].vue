<script setup lang="ts">
const route = useRoute()
const collectionId = computed(() => Number(route.params.id))

interface Recipe {
  id: number
  title: string
  description: string | null
  coverPhoto: string | null
  prepTime: number | null
  cookTime: number | null
  servings: number
}

interface Collection {
  id: number
  name: string
  description: string | null
  isPublic: boolean
  coverPhoto: string | null
}

interface CollectionData {
  collection: Collection
  recipes: Recipe[]
  isOwner: boolean
}

const { data, status, refresh } = await useFetch<CollectionData>(`/api/collections/${collectionId.value}`)

useSeoMeta({
  title: computed(() => data.value?.collection.name || 'Collection'),
  description: computed(() => data.value?.collection.description || 'Recipe collection'),
})

// Remove recipe handling
const recipeToRemove = ref<Recipe | null>(null)
const removing = ref(false)

async function handleRemoveRecipe(): Promise<void> {
  if (!recipeToRemove.value) return

  removing.value = true
  try {
    await $fetch(`/api/collections/${collectionId.value}/recipes/${recipeToRemove.value.id}`, {
      method: 'DELETE',
    })
    recipeToRemove.value = null
    refresh()
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

function getTotalTime(recipe: Recipe): string {
  const total = (recipe.prepTime || 0) + (recipe.cookTime || 0)
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
      <USkeleton class="h-10 w-64" />
      <USkeleton class="h-4 w-48" />
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
        <USkeleton
          v-for="i in 4"
          :key="i"
          class="h-48 rounded-lg"
        />
      </div>
    </div>

    <!-- Error -->
    <div
      v-else-if="!data"
      class="text-center py-16"
    >
      <UIcon
        name="i-heroicons-exclamation-triangle"
        class="w-12 h-12 text-error-500 mx-auto mb-4"
      />
      <h2 class="text-xl font-semibold text-neutral-700 dark:text-neutral-100 mb-2">
        Collection Not Found
      </h2>
      <p class="text-neutral-500 dark:text-neutral-400 mb-6">
        This collection doesn't exist or you don't have access.
      </p>
      <UButton
        to="/collections"
        color="primary"
      >
        Back to Collections
      </UButton>
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Header -->
      <div class="mb-8">
        <NuxtLink
          to="/collections"
          class="text-sm text-neutral-500 dark:text-neutral-400 hover:text-primary-500 mb-2 inline-flex items-center gap-1"
        >
          <UIcon name="i-heroicons-arrow-left" />
          Back to Collections
        </NuxtLink>

        <div class="flex items-start justify-between">
          <div>
            <div class="flex items-center gap-3">
              <h1 class="text-3xl font-bold text-neutral-700 dark:text-neutral-50">
                {{ data.collection.name }}
              </h1>
              <UBadge
                :color="data.collection.isPublic ? 'success' : 'neutral'"
                variant="subtle"
              >
                {{ data.collection.isPublic ? 'Public' : 'Private' }}
              </UBadge>
            </div>
            <p
              v-if="data.collection.description"
              class="text-neutral-500 dark:text-neutral-400 mt-2"
            >
              {{ data.collection.description }}
            </p>
            <p class="text-sm text-neutral-400 dark:text-neutral-500 mt-2">
              {{ data.recipes.length }} recipe{{ data.recipes.length === 1 ? '' : 's' }}
            </p>
          </div>

          <UButton
            v-if="data.isOwner"
            :to="`/collections/${collectionId}/edit`"
            color="neutral"
            variant="outline"
            icon="i-heroicons-pencil"
          >
            Edit
          </UButton>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-if="data.recipes.length === 0"
        class="text-center py-16 bg-neutral-100 dark:bg-neutral-800 rounded-lg"
      >
        <UIcon
          name="i-heroicons-book-open"
          class="w-12 h-12 text-neutral-400 mx-auto mb-4"
        />
        <h2 class="text-xl font-semibold text-neutral-700 dark:text-neutral-100 mb-2">
          No recipes yet
        </h2>
        <p class="text-neutral-500 dark:text-neutral-400 mb-6">
          Add recipes to this collection from recipe pages.
        </p>
        <UButton
          to="/recipes"
          color="primary"
        >
          Browse Recipes
        </UButton>
      </div>

      <!-- Recipes Grid -->
      <div
        v-else
        class="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        <div
          v-for="recipe in data.recipes"
          :key="recipe.id"
          class="group relative"
        >
          <NuxtLink :to="`/recipes/${recipe.id}`">
            <UCard class="h-full bg-neutral-50 dark:bg-neutral-800 hover:shadow-md transition-shadow overflow-hidden">
              <!-- Cover Image -->
              <template #header>
                <div class="h-32 -m-4 mb-0 relative overflow-hidden">
                  <img
                    v-if="recipe.coverPhoto"
                    :src="recipe.coverPhoto"
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
              </template>

              <h3 class="font-semibold text-neutral-700 dark:text-neutral-100 line-clamp-1">
                {{ recipe.title }}
              </h3>
              <p
                v-if="recipe.description"
                class="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-1"
              >
                {{ recipe.description }}
              </p>
              <div class="flex items-center gap-4 text-sm text-neutral-400 dark:text-neutral-500 mt-2">
                <span
                  v-if="getTotalTime(recipe)"
                  class="flex items-center gap-1"
                >
                  <UIcon name="i-heroicons-clock" />
                  {{ getTotalTime(recipe) }}
                </span>
                <span class="flex items-center gap-1">
                  <UIcon name="i-heroicons-users" />
                  {{ recipe.servings }}
                </span>
              </div>
            </UCard>
          </NuxtLink>

          <!-- Remove Button -->
          <UButton
            v-if="data.isOwner"
            color="error"
            variant="solid"
            icon="i-heroicons-x-mark"
            size="xs"
            class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            @click="recipeToRemove = recipe"
          />
        </div>
      </div>
    </template>

    <!-- Remove Recipe Modal -->
    <UModal v-model:open="removeModalOpen">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">
              Remove Recipe
            </h3>
          </template>
          <p class="text-neutral-500 dark:text-neutral-400">
            Remove "{{ recipeToRemove?.title }}" from this collection?
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
                :loading="removing"
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
