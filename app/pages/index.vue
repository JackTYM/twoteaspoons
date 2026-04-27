<script setup lang="ts">
import { transformRecipeToUI } from '~/utils/transformCase'

useSeoMeta({
  title: 'TwoTeaspoons - Recipes Worth Sharing',
  description: 'Discover and share delicious recipes with home cooks',
})

const { isAuthenticated, isAnonymous } = useAuth()

// User needs a real (non-anonymous) account for protected features
const isRealUser = computed(() => isAuthenticated.value && !isAnonymous.value)

// Services
const recipeService = useRecipeService()

// Search input for hero section
const searchQuery = ref('')

function handleSearch(): void {
  if (searchQuery.value.trim()) {
    navigateTo(`/browse?q=${encodeURIComponent(searchQuery.value.trim())}`)
  } else {
    navigateTo('/browse')
  }
}

// Fetch featured recipes (limited set for homepage)
const { data: recipesData, status } = await useAsyncData(
  'home-recipes',
  async () => {
    const recipes = await recipeService.getPublicRecipes()
    return { recipes: recipes.map(transformRecipeToUI) }
  }
)

// Show only the first 9 featured recipes
const featuredRecipes = computed(() => {
  if (!recipesData.value?.recipes) return []
  // Sort by saveCount (popularity), then by id for stability, and take top 9
  return [...recipesData.value.recipes]
    .sort((a, b) => {
      const saveCountDiff = (b.saveCount || 0) - (a.saveCount || 0)
      if (saveCountDiff !== 0) return saveCountDiff
      return b.id - a.id // Secondary sort by id for stable ordering
    })
    .slice(0, 9)
})

// Sign in prompt
const showSignInPrompt = ref(false)

function promptSignIn(): void {
  showSignInPrompt.value = true
}

function goToSignIn(): void {
  navigateTo('/auth/signin')
}

function goToSignUp(): void {
  navigateTo('/auth/signup')
}

// Recipe actions
async function handleSave(recipeId: number): Promise<void> {
  if (!isRealUser.value) {
    promptSignIn()
    return
  }

  if (!recipesData.value) return
  const recipeIndex = recipesData.value.recipes.findIndex((r) => r.id === recipeId)
  if (recipeIndex === -1) return

  const recipe = recipesData.value.recipes[recipeIndex]
  if (!recipe) return

  const wasSaved = recipe.isSaved ?? false
  const originalSaveCount = recipe.saveCount

  // Optimistic update - replace the entire recipes array to trigger reactivity
  const newRecipes = [...recipesData.value.recipes]
  newRecipes[recipeIndex] = {
    ...recipe,
    isSaved: !wasSaved,
    saveCount: (originalSaveCount ?? 0) + (wasSaved ? -1 : 1),
  }
  recipesData.value = { ...recipesData.value, recipes: newRecipes }

  try {
    if (wasSaved) {
      await recipeService.unsaveRecipe(recipeId)
    } else {
      await recipeService.saveRecipe(recipeId)
    }
  } catch (err) {
    // Revert on error - replace entire array to trigger reactivity
    if (recipesData.value) {
      const currentRecipe = recipesData.value.recipes[recipeIndex]
      if (currentRecipe) {
        const revertedRecipes = [...recipesData.value.recipes]
        revertedRecipes[recipeIndex] = {
          ...currentRecipe,
          isSaved: wasSaved,
          saveCount: originalSaveCount,
        }
        recipesData.value = { ...recipesData.value, recipes: revertedRecipes }
      }
    }
    console.error('Failed to toggle save:', err)
  }
}

// Collection picker
const showCollectionPicker = ref(false)
const selectedRecipeForCollection = ref<number | null>(null)

function handleAddToCollection(recipeId: number): void {
  if (!isRealUser.value) {
    promptSignIn()
    return
  }
  selectedRecipeForCollection.value = recipeId
  showCollectionPicker.value = true
}
</script>

<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950">
    <div class="max-w-6xl mx-auto px-4 py-6">
      <!-- Hero Section (for non-authenticated users) -->
      <div
        v-if="!isRealUser"
        class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cream-50 to-primary-50 dark:from-neutral-900 dark:to-primary-950/50 p-6 sm:p-8 mb-8"
      >
        <!-- Background decoration -->
        <div class="absolute -right-12 -bottom-12 opacity-10 dark:opacity-5">
          <svg
            width="240"
            height="240"
            viewBox="0 0 100 100"
            class="text-primary-500"
          >
            <ellipse
              cx="30"
              cy="70"
              rx="15"
              ry="25"
              fill="currentColor"
              transform="rotate(-30 30 70)"
            />
            <ellipse
              cx="70"
              cy="70"
              rx="15"
              ry="25"
              fill="currentColor"
              transform="rotate(30 70 70)"
            />
            <rect
              x="25"
              y="10"
              width="6"
              height="50"
              rx="3"
              fill="currentColor"
              transform="rotate(-30 28 35)"
            />
            <rect
              x="69"
              y="10"
              width="6"
              height="50"
              rx="3"
              fill="currentColor"
              transform="rotate(30 72 35)"
            />
          </svg>
        </div>

        <!-- Content -->
        <div class="relative z-10 max-w-xl">
          <h1 class="text-2xl sm:text-3xl font-display text-neutral-700 dark:text-neutral-50 mb-2">
            Recipes Worth Sharing
          </h1>

          <p class="text-neutral-500 dark:text-neutral-400 mb-6 text-sm sm:text-base">
            Discover and share delicious recipes from home cooks like you
          </p>

          <!-- Search input -->
          <form
            class="relative max-w-md"
            @submit.prevent="handleSearch"
          >
            <UInput
              v-model="searchQuery"
              placeholder="Search recipes..."
              size="lg"
              icon="i-heroicons-magnifying-glass"
              class="shadow-sm"
            >
              <template #trailing>
                <UButton
                  type="submit"
                  color="primary"
                  size="xs"
                  class="mr-1"
                >
                  Search
                </UButton>
              </template>
            </UInput>
          </form>

          <!-- CTA Buttons -->
          <div class="flex flex-wrap gap-3 mt-6">
            <UButton
              to="/auth/signup"
              color="primary"
              size="lg"
              class="press-effect"
            >
              Get Started
            </UButton>
            <UButton
              to="/browse"
              color="neutral"
              variant="outline"
              size="lg"
            >
              Browse Recipes
            </UButton>
          </div>
        </div>
      </div>

      <!-- Quick Actions (for authenticated users) -->
      <HomeQuickActions v-if="isRealUser" />

      <!-- Featured Recipes Section -->
      <section>
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-xl font-display text-neutral-700 dark:text-neutral-100">
              {{ isRealUser ? 'Popular Recipes' : 'Discover Recipes' }}
            </h2>
            <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Most loved by the community
            </p>
          </div>
          <UButton
            to="/browse"
            color="neutral"
            variant="ghost"
            trailing-icon="i-heroicons-arrow-right"
          >
            View All
          </UButton>
        </div>

        <!-- Loading State -->
        <div
          v-if="status === 'pending'"
          class="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <div
            v-for="i in 6"
            :key="i"
            class="aspect-[4/3] rounded-xl animate-shimmer"
          />
        </div>

        <!-- Empty State -->
        <EmptyState
          v-else-if="featuredRecipes.length === 0"
          type="recipes"
          title="No recipes yet"
          description="Be the first to share a recipe with the community!"
          action-label="Add Recipe"
          action-to="/recipes/new"
        />

        <!-- Recipe Grid -->
        <div
          v-else
          class="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <BrowseRecipeCard
            v-for="recipe in featuredRecipes"
            :key="recipe.id"
            :recipe="recipe"
            view="grid"
            @save="handleSave"
            @add-to-collection="handleAddToCollection"
          />
        </div>

        <!-- View More Link -->
        <div
          v-if="featuredRecipes.length > 0"
          class="mt-8 text-center"
        >
          <UButton
            to="/browse"
            color="primary"
            variant="soft"
            size="lg"
            class="press-effect"
          >
            Browse All Recipes
          </UButton>
        </div>
      </section>
    </div>

    <!-- Collection Picker Modal -->
    <CollectionsCollectionPickerModal
      v-model:open="showCollectionPicker"
      :recipe-id="selectedRecipeForCollection"
    />

    <!-- Sign In Prompt Modal -->
    <UModal
      v-model:open="showSignInPrompt"
      title="Join TwoTeaspoons"
      description="Create a free account to unlock all features"
    >
      <template #content>
        <UCard class="overflow-hidden">
          <template #header>
            <div class="relative -m-4 mb-0 p-6 bg-gradient-to-br from-primary-50 to-cream-100 dark:from-primary-950/50 dark:to-neutral-900">
              <div class="flex items-center gap-4">
                <div class="w-14 h-14 rounded-2xl bg-white dark:bg-neutral-800 shadow-lg flex items-center justify-center">
                  <UIcon
                    name="i-heroicons-sparkles"
                    class="w-7 h-7 text-primary-500"
                  />
                </div>
                <div>
                  <h3 class="text-xl font-display text-neutral-700 dark:text-neutral-100">
                    Join TwoTeaspoons
                  </h3>
                  <p class="text-sm text-neutral-500 dark:text-neutral-400">
                    Recipes worth sharing
                  </p>
                </div>
              </div>
            </div>
          </template>

          <div class="space-y-4">
            <p class="text-neutral-600 dark:text-neutral-300">
              Create a free account to unlock all features:
            </p>
            <ul class="space-y-2">
              <li class="flex items-center gap-3 text-neutral-600 dark:text-neutral-300">
                <div class="w-8 h-8 rounded-lg bg-sage-100 dark:bg-sage-900/30 flex items-center justify-center">
                  <UIcon
                    name="i-heroicons-bookmark"
                    class="w-4 h-4 text-sage-600 dark:text-sage-400"
                  />
                </div>
                <span>Save your favorite recipes</span>
              </li>
              <li class="flex items-center gap-3 text-neutral-600 dark:text-neutral-300">
                <div class="w-8 h-8 rounded-lg bg-butter-100 dark:bg-butter-900/30 flex items-center justify-center">
                  <UIcon
                    name="i-heroicons-folder"
                    class="w-4 h-4 text-butter-600 dark:text-butter-400"
                  />
                </div>
                <span>Create recipe cookbooks</span>
              </li>
              <li class="flex items-center gap-3 text-neutral-600 dark:text-neutral-300">
                <div class="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <UIcon
                    name="i-heroicons-calendar"
                    class="w-4 h-4 text-primary-600 dark:text-primary-400"
                  />
                </div>
                <span>Plan your weekly meals</span>
              </li>
              <li class="flex items-center gap-3 text-neutral-600 dark:text-neutral-300">
                <div class="w-8 h-8 rounded-lg bg-terracotta-100 dark:bg-terracotta-900/30 flex items-center justify-center">
                  <UIcon
                    name="i-heroicons-shopping-cart"
                    class="w-4 h-4 text-terracotta-600 dark:text-terracotta-400"
                  />
                </div>
                <span>Generate shopping lists</span>
              </li>
            </ul>
          </div>

          <template #footer>
            <div class="flex flex-col sm:flex-row gap-2">
              <UButton
                color="primary"
                size="lg"
                block
                class="flex-1"
                @click="goToSignUp"
              >
                Create Account
              </UButton>
              <UButton
                color="neutral"
                variant="outline"
                size="lg"
                class="flex-1"
                @click="goToSignIn"
              >
                Sign In
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
