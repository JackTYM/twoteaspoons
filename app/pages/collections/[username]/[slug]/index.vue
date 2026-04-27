<script setup lang="ts">
import type { CollectionWithRecipes, RecipeWithAuthor } from '~/services/collectionService'

const route = useRoute()
const username = computed(() => route.params.username as string)
const collectionSlug = computed(() => route.params.slug as string)
const { user } = useAuth()
const { getRecipeUrl } = useRecipeUrl()
const collectionService = useCollectionService()

// Track ownership
const isOwner = ref(false)

const { data, status } = await useAsyncData<CollectionWithRecipes | null>(
  `collection-${username.value}-${collectionSlug.value}`,
  async () => {
    const result = await collectionService.getCollectionBySlug(username.value, collectionSlug.value)
    if (result.error) {
      throw result.error
    }
    if (result.data) {
      isOwner.value = user.value?.id === result.data.user_id
    }
    return result.data
  },
  { watch: [username, collectionSlug] }
)

// If this is the current user's collection, redirect to the shorter URL
watchEffect(() => {
  if (isOwner.value && user.value?.username === username.value) {
    navigateTo(`/collections/${collectionSlug.value}`, { replace: true })
  }
})

useSeoMeta({
  title: computed(
    () =>
      data.value?.name
        ? `${data.value.name} by @${username.value}`
        : 'Cookbook'
  ),
  description: computed(
    () => data.value?.description || 'Recipe cookbook'
  ),
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
        This cookbook doesn't exist or is private.
      </p>
      <UButton
        to="/browse"
        color="primary"
        class="press-effect"
      >
        Browse Recipes
      </UButton>
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Header with author info -->
      <div class="-mx-4 sm:-mx-6 -mt-8 mb-8">
        <!-- Cover -->
        <div class="relative h-48 sm:h-56">
          <img
            v-if="data.cover_photo"
            :src="data.cover_photo"
            :alt="data.name"
            class="w-full h-full object-cover"
          >
          <div
            v-else
            class="w-full h-full bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800"
          />
          <div
            class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"
          />

          <!-- Title overlay -->
          <div class="absolute bottom-0 left-0 right-0 p-6">
            <h1 class="text-2xl sm:text-3xl font-display text-white mb-2">
              {{ data.name }}
            </h1>
            <NuxtLink
              :to="`/users/${username}`"
              class="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors"
            >
              <UIcon
                name="i-heroicons-user-circle"
                class="w-5 h-5"
              />
              <span>@{{ username }}</span>
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Description -->
      <p
        v-if="data.description"
        class="text-neutral-600 dark:text-neutral-300 mb-6"
      >
        {{ data.description }}
      </p>

      <!-- Recipe count -->
      <p class="text-neutral-500 dark:text-neutral-400 mb-6">
        {{ data.recipes.length }}
        {{ data.recipes.length === 1 ? 'recipe' : 'recipes' }}
      </p>

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
        <p class="text-neutral-500 dark:text-neutral-400">
          This cookbook is empty.
        </p>
      </div>

      <!-- Recipes Grid -->
      <div
        v-else
        class="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-stagger"
      >
        <NuxtLink
          v-for="recipe in data.recipes"
          :key="recipe.id"
          :to="getRecipeUrl(recipe)"
          class="group"
        >
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
      </div>
    </template>
  </div>
</template>
