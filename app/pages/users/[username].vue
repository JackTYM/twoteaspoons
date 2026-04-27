<script setup lang="ts">
import type { DbRecipe, DbCollection } from '~/types/database'

const route = useRoute()
const username = route.params.username as string

// Initialize services
const userService = useUserService()
const recipeService = useRecipeService()
const collectionService = useCollectionService()

// View model interfaces (camelCase for template)
interface ProfileRecipe {
  id: number
  slug: string
  title: string
  description: string | null
  coverPhoto: string | null
  prepTime: number | null
  cookTime: number | null
  servings: number | null
  saveCount: number | null
  createdAt: string
  isPublished?: boolean
  author: { name: string; username: string | null }
}

interface ProfileCollection {
  id: number
  name: string
  slug: string
  description: string | null
  coverPhoto: string | null
  createdAt: string
  recipeCount: number
  previewPhotos: string[]
  isPublic?: boolean
}

interface ProfileData {
  user: {
    id: string
    name: string
    username: string | null
    avatar: string | null
    bio: string | null
    joinedAt: string
  }
  stats: {
    recipeCount: number
    collectionCount: number
    totalSavesReceived: number
  }
  recipes: ProfileRecipe[]
  collections: ProfileCollection[]
}

// Helper to transform DbRecipe to ProfileRecipe
function transformRecipe(recipe: DbRecipe, authorName: string, authorUsername: string | null): ProfileRecipe {
  return {
    id: recipe.id,
    slug: recipe.slug,
    title: recipe.title,
    description: recipe.description,
    coverPhoto: recipe.cover_photo,
    prepTime: recipe.prep_time,
    cookTime: recipe.cook_time,
    servings: recipe.servings,
    saveCount: recipe.save_count,
    createdAt: recipe.created_at,
    isPublished: recipe.is_published,
    author: { name: authorName, username: authorUsername },
  }
}

// Helper to transform DbCollection to ProfileCollection
function transformCollection(collection: DbCollection, recipeCount: number = 0): ProfileCollection {
  return {
    id: collection.id,
    name: collection.name,
    slug: collection.slug,
    description: collection.description,
    coverPhoto: collection.cover_photo,
    createdAt: collection.created_at,
    recipeCount,
    previewPhotos: [], // Will be populated separately if needed
    isPublic: collection.is_public,
  }
}

// Fetch profile data using the user service
const { data, status, error } = await useAsyncData<ProfileData | null>(
  `user-profile-${username}`,
  async () => {
    const profile = await userService.getUserByUsername(username)
    if (!profile) return null

    // Calculate total saves received
    const totalSaves = profile.recipes.reduce((sum, r) => sum + (r.save_count || 0), 0)

    // Transform data to view model format
    return {
      user: {
        id: profile.user.id,
        name: profile.user.name,
        username: profile.user.username,
        avatar: profile.user.avatar,
        bio: profile.user.bio,
        joinedAt: profile.user.created_at,
      },
      stats: {
        recipeCount: profile.recipes.length,
        collectionCount: profile.collections.length,
        totalSavesReceived: totalSaves,
      },
      recipes: profile.recipes.map(r =>
        transformRecipe(r, profile.user.name, profile.user.username)
      ),
      collections: profile.collections.map(c => transformCollection(c)),
    }
  }
)

// Check if viewing own profile
const { user: currentUser, isAuthenticated, isAnonymous } = useAuth()
const isOwnProfile = computed(() =>
  isAuthenticated.value && !isAnonymous.value && currentUser.value?.username === username
)

// Fetch own content (including drafts and private) when viewing own profile
const hasFetchedOwnContent = ref(false)

async function fetchOwnContent(): Promise<void> {
  if (hasFetchedOwnContent.value || !data.value) return

  // Double-check this is actually the user's own profile before fetching private content
  // This prevents race conditions and ensures data integrity
  if (!isOwnProfile.value || data.value.user.id !== currentUser.value?.id) {
    console.warn('fetchOwnContent called but not viewing own profile')
    return
  }

  hasFetchedOwnContent.value = true

  try {
    // Fetch all recipes (including drafts) using the recipe service
    const myRecipes = await recipeService.getMyRecipes()

    // Re-verify after async operation to prevent race conditions
    if (!isOwnProfile.value || !data.value || data.value.user.id !== currentUser.value?.id) {
      return
    }

    if (myRecipes.length > 0) {
      data.value.recipes = myRecipes.map(r => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        description: r.description,
        coverPhoto: r.cover_photo,
        prepTime: r.prep_time,
        cookTime: r.cook_time,
        servings: r.servings,
        saveCount: r.save_count,
        createdAt: r.created_at,
        isPublished: r.is_published,
        author: r.author
          ? { name: r.author.name, username: r.author.username }
          : { name: '', username: null },
      }))
      data.value.stats.recipeCount = myRecipes.length
    }

    // Fetch all collections (including private) using the collection service
    const { data: myCollections } = await collectionService.getMyCollections()

    // Re-verify again after second async operation
    if (!isOwnProfile.value || !data.value || data.value.user.id !== currentUser.value?.id) {
      return
    }

    if (myCollections && myCollections.length > 0) {
      data.value.collections = myCollections.map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        coverPhoto: c.cover_photo,
        createdAt: c.created_at,
        recipeCount: c.recipe_count,
        previewPhotos: [],
        isPublic: c.is_public,
      }))
      data.value.stats.collectionCount = myCollections.length
    }
  } catch (err) {
    console.error('Failed to fetch own content:', err)
  }
}

// Reset fetch flag when route changes (navigating to different profile)
watch(() => route.params.username, () => {
  hasFetchedOwnContent.value = false
})

// Watch for when profile data is loaded AND it's own profile
watch(
  [isOwnProfile, () => data.value],
  ([isOwn, profileData]) => {
    if (isOwn && profileData && !hasFetchedOwnContent.value) {
      fetchOwnContent()
    }
  },
  { immediate: true }
)

// Also try on mounted in case the watch doesn't trigger
onMounted(() => {
  if (isOwnProfile.value && data.value && !hasFetchedOwnContent.value) {
    fetchOwnContent()
  }
})

// SEO
useSeoMeta({
  title: () => data.value?.user.name ? `${data.value.user.name} (@${data.value.user.username})` : 'Profile',
  description: () => data.value?.user.bio || `Check out ${data.value?.user.name}'s recipes on TwoTeaspoons`,
})

// Tabs
const activeTab = ref<'recipes' | 'collections'>('recipes')

// Format date
function formatJoinDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// Actions
const isRealUser = computed(() => isAuthenticated.value && !isAnonymous.value)

async function handleSave(recipeId: number): Promise<void> {
  if (!isRealUser.value) {
    navigateTo('/auth/signin')
    return
  }

  // Save the recipe using the recipe service
  try {
    await recipeService.saveRecipe(recipeId)
  } catch (err) {
    console.error('Failed to save recipe:', err)
  }
}

function handleAddToCollection(_recipeId: number): void {
  if (!isRealUser.value) {
    navigateTo('/auth/signin')
    return
  }
  // TODO: Open collection picker modal
}
</script>

<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950">
    <!-- Error State -->
    <div
      v-if="error"
      class="max-w-4xl mx-auto px-4 py-12"
    >
      <EmptyState
        type="search"
        title="User not found"
        description="This user doesn't exist or may have been removed."
        action-label="Go Home"
        action-to="/"
        action-icon="i-heroicons-home"
      />
    </div>

    <!-- Loading State -->
    <div
      v-else-if="status === 'pending'"
      class="max-w-4xl mx-auto px-4 py-8"
    >
      <div class="animate-pulse space-y-6">
        <div class="flex items-center gap-6">
          <div class="w-24 h-24 rounded-full bg-neutral-200 dark:bg-neutral-800" />
          <div class="space-y-3">
            <div class="h-8 w-48 bg-neutral-200 dark:bg-neutral-800 rounded" />
            <div class="h-4 w-32 bg-neutral-200 dark:bg-neutral-800 rounded" />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-4">
          <div class="h-20 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
          <div class="h-20 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
          <div class="h-20 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
        </div>
      </div>
    </div>

    <!-- Profile Content -->
    <div
      v-else-if="data"
      class="max-w-4xl mx-auto px-4 py-8"
    >
      <!-- Profile Header -->
      <div class="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8">
        <!-- Avatar -->
        <div class="relative">
          <div
            v-if="data.user.avatar"
            class="w-24 h-24 rounded-full overflow-hidden ring-4 ring-white dark:ring-neutral-800 shadow-lg"
          >
            <img
              :src="data.user.avatar"
              :alt="data.user.name"
              class="w-full h-full object-cover"
            >
          </div>
          <div
            v-else
            class="w-24 h-24 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center ring-4 ring-white dark:ring-neutral-800 shadow-lg"
          >
            <span class="text-3xl font-display text-white">
              {{ data.user.name?.charAt(0).toUpperCase() }}
            </span>
          </div>
        </div>

        <!-- User Info -->
        <div class="flex-1 text-center sm:text-left">
          <h1 class="text-2xl font-display text-neutral-700 dark:text-neutral-50 mb-1">
            {{ data.user.name }}
          </h1>
          <p class="text-neutral-500 dark:text-neutral-400 mb-3">
            @{{ data.user.username }}
          </p>
          <p
            v-if="data.user.bio"
            class="text-neutral-600 dark:text-neutral-300 mb-3 max-w-md"
          >
            {{ data.user.bio }}
          </p>
          <p class="text-sm text-neutral-400 dark:text-neutral-500 flex items-center justify-center sm:justify-start gap-1">
            <UIcon
              name="i-heroicons-calendar"
              class="w-4 h-4"
            />
            Joined {{ formatJoinDate(data.user.joinedAt) }}
          </p>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-3 gap-4 mb-8">
        <div class="bg-white dark:bg-neutral-800 rounded-xl p-4 text-center border border-neutral-200 dark:border-neutral-700">
          <p class="text-2xl font-semibold text-neutral-700 dark:text-neutral-100">
            {{ data.stats.recipeCount }}
          </p>
          <p class="text-sm text-neutral-500 dark:text-neutral-400">
            {{ data.stats.recipeCount === 1 ? 'Recipe' : 'Recipes' }}
          </p>
        </div>
        <div class="bg-white dark:bg-neutral-800 rounded-xl p-4 text-center border border-neutral-200 dark:border-neutral-700">
          <p class="text-2xl font-semibold text-neutral-700 dark:text-neutral-100">
            {{ data.stats.collectionCount }}
          </p>
          <p class="text-sm text-neutral-500 dark:text-neutral-400">
            {{ data.stats.collectionCount === 1 ? 'Cookbook' : 'Cookbooks' }}
          </p>
        </div>
        <div class="bg-white dark:bg-neutral-800 rounded-xl p-4 text-center border border-neutral-200 dark:border-neutral-700">
          <p class="text-2xl font-semibold text-neutral-700 dark:text-neutral-100">
            {{ data.stats.totalSavesReceived }}
          </p>
          <p class="text-sm text-neutral-500 dark:text-neutral-400">
            {{ data.stats.totalSavesReceived === 1 ? 'Save' : 'Saves' }}
          </p>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex gap-2 mb-6 border-b border-neutral-200 dark:border-neutral-700">
        <button
          :class="[
            'px-4 py-2 font-medium transition-colors relative',
            activeTab === 'recipes'
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
          ]"
          @click="activeTab = 'recipes'"
        >
          Recipes
          <span
            v-if="activeTab === 'recipes'"
            class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500"
          />
        </button>
        <button
          :class="[
            'px-4 py-2 font-medium transition-colors relative',
            activeTab === 'collections'
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
          ]"
          @click="activeTab = 'collections'"
        >
          Cookbooks
          <span
            v-if="activeTab === 'collections'"
            class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500"
          />
        </button>
      </div>

      <!-- Recipes Tab -->
      <div v-if="activeTab === 'recipes'">
        <!-- New Recipe button (own profile only) -->
        <div
          v-if="isOwnProfile"
          class="flex justify-end mb-4"
        >
          <UButton
            to="/recipes/new"
            color="primary"
            icon="i-heroicons-plus"
          >
            New Recipe
          </UButton>
        </div>

        <EmptyState
          v-if="data.recipes.length === 0"
          type="recipes"
          :title="isOwnProfile ? 'No recipes yet' : 'No recipes yet'"
          :description="isOwnProfile ? 'Create your first recipe to share with others.' : `${data.user.name} hasn't shared any recipes yet.`"
          :action-label="isOwnProfile ? 'Create Recipe' : undefined"
          :action-to="isOwnProfile ? '/recipes/new' : undefined"
        />

        <div
          v-else
          class="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <div
            v-for="recipe in data.recipes"
            :key="recipe.id"
            class="relative"
            :class="recipe.isPublished === false ? 'opacity-70' : ''"
          >
            <!-- Draft Badge -->
            <div
              v-if="recipe.isPublished === false"
              class="absolute top-3 left-3 z-10 px-2 py-1 bg-amber-500 text-white text-xs font-medium rounded-full shadow"
            >
              Draft
            </div>
            <BrowseRecipeCard
              :recipe="recipe"
              view="grid"
              @save="handleSave"
              @add-to-collection="handleAddToCollection"
            />
          </div>
        </div>
      </div>

      <!-- Collections Tab -->
      <div v-if="activeTab === 'collections'">
        <!-- New Collection button (own profile only) -->
        <div
          v-if="isOwnProfile"
          class="flex justify-end mb-4"
        >
          <UButton
            to="/collections/new"
            color="primary"
            icon="i-heroicons-plus"
          >
            New Cookbook
          </UButton>
        </div>

        <EmptyState
          v-if="data.collections.length === 0"
          type="collections"
          :title="isOwnProfile ? 'No cookbooks yet' : 'No public cookbooks'"
          :description="isOwnProfile ? 'Create your first cookbook to organize recipes.' : `${data.user.name} hasn't shared any cookbooks yet.`"
          :action-label="isOwnProfile ? 'Create Cookbook' : undefined"
          :action-to="isOwnProfile ? '/collections/new' : undefined"
        />

        <div
          v-else
          class="grid md:grid-cols-2 gap-4"
        >
          <NuxtLink
            v-for="collection in data.collections"
            :key="collection.id"
            :to="`/collections/${username}/${collection.slug}`"
            class="group block relative"
            :class="collection.isPublic === false ? 'opacity-70' : ''"
          >
            <!-- Private Badge -->
            <div
              v-if="collection.isPublic === false"
              class="absolute top-3 left-3 z-10 px-2 py-1 bg-neutral-500 text-white text-xs font-medium rounded-full shadow"
            >
              Private
            </div>
            <div class="bg-white dark:bg-neutral-800 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 hover:border-primary-400 dark:hover:border-primary-600 transition-colors">
              <!-- Preview Grid -->
              <div class="aspect-[2/1] relative bg-neutral-100 dark:bg-neutral-900">
                <div
                  v-if="collection.previewPhotos.length > 0"
                  class="grid grid-cols-2 gap-0.5 h-full"
                >
                  <img
                    v-for="(photo, idx) in collection.previewPhotos.slice(0, 4)"
                    :key="idx"
                    :src="photo"
                    :alt="`Recipe ${idx + 1}`"
                    class="w-full h-full object-cover"
                  >
                  <div
                    v-for="i in Math.max(0, 4 - collection.previewPhotos.length)"
                    :key="`empty-${i}`"
                    class="w-full h-full bg-neutral-200 dark:bg-neutral-700"
                  />
                </div>
                <div
                  v-else
                  class="absolute inset-0 flex items-center justify-center"
                >
                  <UIcon
                    name="i-heroicons-folder"
                    class="w-12 h-12 text-neutral-300 dark:text-neutral-600"
                  />
                </div>
              </div>

              <!-- Content -->
              <div class="p-4">
                <h3 class="font-display text-lg text-neutral-700 dark:text-neutral-100 mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {{ collection.name }}
                </h3>
                <p
                  v-if="collection.description"
                  class="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2 mb-2"
                >
                  {{ collection.description }}
                </p>
                <p class="text-sm text-neutral-400 dark:text-neutral-500">
                  {{ collection.recipeCount }} {{ collection.recipeCount === 1 ? 'recipe' : 'recipes' }}
                </p>
              </div>
            </div>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
