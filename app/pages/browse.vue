<script setup lang="ts">
import type { SortOption } from '~/components/browse/SortDropdown.vue'

useSeoMeta({
  title: 'Browse Recipes',
  description: 'Discover delicious recipes shared by home cooks',
})

const route = useRoute()
const router = useRouter()
const { isAuthenticated, isAnonymous, getAuthHeaders } = useAuth()

// User needs a real (non-anonymous) account for protected features
const isRealUser = computed(() => isAuthenticated.value && !isAnonymous.value)

const sortBy = ref<SortOption>('newest')
const searchQuery = ref('')
const viewMode = ref<'grid' | 'list'>('grid')

// Track hydration state to avoid SSR/client mismatch
const isHydrated = ref(false)

// Use effective values that only change after hydration
const effectiveViewMode = computed(() => isHydrated.value ? viewMode.value : 'grid')

// Filters (declared early so watchers can reference it)
interface Filters {
  maxTime: number | null
  minServings: number | null
  maxServings: number | null
  categories: string[]
}

const filters = ref<Filters>({
  maxTime: null,
  minServings: null,
  maxServings: null,
  categories: [],
})

// Load preferences from localStorage and URL params
// Use nextTick to wait for hydration to complete before applying localStorage preferences
onMounted(async () => {
  // Load filters from URL query params first (these are consistent between SSR and client)
  if (route.query.categories) {
    const categoryParam = route.query.categories as string
    filters.value.categories = categoryParam.split(',').filter(Boolean)
  }
  if (route.query.maxTime) {
    filters.value.maxTime = parseInt(route.query.maxTime as string, 10) || null
  }
  if (route.query.q) {
    searchQuery.value = route.query.q as string
  }

  // Wait for hydration to complete before applying localStorage preferences
  await nextTick()
  // Mark hydrated AFTER applying preferences so the computed uses them together
  const savedView = localStorage.getItem('browse-view')
  const savedSort = localStorage.getItem('browse-sort')
  if (savedView === 'grid' || savedView === 'list') viewMode.value = savedView
  if (savedSort) sortBy.value = savedSort as typeof sortBy.value
  isHydrated.value = true
})

// Save preferences to localStorage
watch(viewMode, (val) => localStorage.setItem('browse-view', val))
watch(sortBy, (val) => localStorage.setItem('browse-sort', val))

// Sync filters to URL (debounced)
const updateUrlTimer = ref<ReturnType<typeof setTimeout> | null>(null)
watch([() => filters.value.categories, searchQuery], () => {
  if (updateUrlTimer.value) clearTimeout(updateUrlTimer.value)
  updateUrlTimer.value = setTimeout(() => {
    const query: Record<string, string> = {}
    if (filters.value.categories.length > 0) {
      query.categories = filters.value.categories.join(',')
    }
    if (filters.value.maxTime) {
      query.maxTime = String(filters.value.maxTime)
    }
    if (searchQuery.value) {
      query.q = searchQuery.value
    }
    router.replace({ query: Object.keys(query).length > 0 ? query : undefined })
  }, 300)
}, { deep: true })

// Mobile filter drawer
const showFilterDrawer = ref(false)

// Fetch category names for display
const { data: categoriesData } = await useFetch<{
  groups: Array<{ type: string; label: string; categories: Array<{ id: number; name: string; slug: string }> }>
}>('/api/categories')

// Map slug to name for display
const categoryNameMap = computed(() => {
  const map: Record<string, string> = {}
  for (const group of categoriesData.value?.groups || []) {
    for (const cat of group.categories) {
      map[cat.slug] = cat.name
    }
  }
  return map
})

// Computed: active filters for display
const activeFilters = computed(() => {
  const result: Array<{ key: string; label: string; value: string }> = []

  if (filters.value.maxTime) {
    result.push({
      key: 'maxTime',
      label: 'Time',
      value: filters.value.maxTime >= 60
        ? `${filters.value.maxTime / 60}h or less`
        : `${filters.value.maxTime}m or less`,
    })
  }

  if (filters.value.minServings !== null) {
    const max = filters.value.maxServings
    result.push({
      key: 'servings',
      label: 'Servings',
      value: max ? `${filters.value.minServings}-${max}` : `${filters.value.minServings}+`,
    })
  }

  // Add category filters as individual chips
  for (const slug of filters.value.categories) {
    result.push({
      key: `category:${slug}`,
      label: 'Category',
      value: categoryNameMap.value[slug] || slug,
    })
  }

  if (searchQuery.value) {
    result.push({
      key: 'search',
      label: 'Search',
      value: searchQuery.value,
    })
  }

  return result
})

function removeFilter(key: string): void {
  if (key === 'maxTime') {
    filters.value.maxTime = null
  } else if (key === 'servings') {
    filters.value.minServings = null
    filters.value.maxServings = null
  } else if (key === 'search') {
    searchQuery.value = ''
  } else if (key.startsWith('category:')) {
    const slug = key.replace('category:', '')
    filters.value.categories = filters.value.categories.filter(c => c !== slug)
  }
}

function clearAllFilters(): void {
  filters.value = { maxTime: null, minServings: null, maxServings: null, categories: [] }
  searchQuery.value = ''
}

const hasActiveFilters = computed(() =>
  filters.value.maxTime !== null ||
  filters.value.minServings !== null ||
  filters.value.categories.length > 0 ||
  searchQuery.value !== ''
)

// Fetch recipes
interface RecipeCategory {
  id: number
  name: string
  slug: string
  icon: string | null
  type: string
}

interface RecipePreview {
  id: number
  slug: string
  title: string
  description: string | null
  coverPhoto: string | null
  prepTime: number | null
  cookTime: number | null
  servings: number | null
  avgTasteRating: string | null
  ratingCount: number | null
  saveCount: number | null
  isSaved?: boolean
  createdAt: string
  author: { name: string; username: string | null } | null
  categories?: RecipeCategory[]
}

// Server-side category filter (passed to API)
const categoryQueryParam = computed(() =>
  filters.value.categories.length > 0 ? filters.value.categories.join(',') : undefined
)

const { data: recipesData, status } = await useFetch<{ recipes: RecipePreview[] }>('/api/recipes', {
  query: {
    public: true,
    categories: categoryQueryParam,
  },
  headers: getAuthHeaders(),
  watch: [categoryQueryParam], // Re-fetch when categories change
})

const allRecipes = computed(() => recipesData.value?.recipes || [])

// Computed: filtered and sorted recipes
const recipes = computed(() => {
  let result = [...allRecipes.value]

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(r =>
      r.title.toLowerCase().includes(query) ||
      r.description?.toLowerCase().includes(query)
    )
  }

  // Time filter
  if (filters.value.maxTime) {
    result = result.filter(r => {
      const total = (r.prepTime || 0) + (r.cookTime || 0)
      return total <= filters.value.maxTime!
    })
  }

  // Servings filter
  if (filters.value.minServings !== null) {
    result = result.filter(r => {
      if (!r.servings) return false
      if (r.servings < filters.value.minServings!) return false
      if (filters.value.maxServings && r.servings > filters.value.maxServings) return false
      return true
    })
  }

  // Sorting - only apply after hydration to avoid mismatch between SSR and client
  // During SSR and initial hydration, use API's default order (newest)
  if (isHydrated.value && sortBy.value !== 'newest') {
    result.sort((a, b) => {
      let primarySort = 0
      switch (sortBy.value) {
        case 'most-saved':
          primarySort = (b.saveCount || 0) - (a.saveCount || 0)
          break
        case 'oldest':
          primarySort = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'a-z':
          primarySort = a.title.localeCompare(b.title)
          break
        case 'z-a':
          primarySort = b.title.localeCompare(a.title)
          break
        case 'cook-time':
          primarySort = ((a.prepTime || 0) + (a.cookTime || 0)) - ((b.prepTime || 0) + (b.cookTime || 0))
          break
        case 'prep-time':
          primarySort = (a.prepTime || 0) - (b.prepTime || 0)
          break
      }
      // Secondary sort by id for stable ordering when primary sort values are equal
      return primarySort !== 0 ? primarySort : b.id - a.id
    })
  }

  return result
})

// Sign in prompt
const showSignInPrompt = ref(false)

function promptSignIn(): void {
  // Blur the active element before opening modal to prevent aria-hidden focus conflict
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur()
  }
  showSignInPrompt.value = true
}

function goToSignIn(): void {
  navigateTo('/auth/signin')
}

function goToSignUp(): void {
  navigateTo('/auth/signup')
}

// Keyboard shortcut for search
if (import.meta.client) {
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
      e.preventDefault()
      const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
      searchInput?.focus()
    }
  })
}

// Recipe actions
async function handleSave(recipeId: number): Promise<void> {
  if (!isRealUser.value) {
    promptSignIn()
    return
  }

  // Find the recipe in the data
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
      await $fetch(`/api/recipes/by-id/${recipeId}/save`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
    } else {
      await $fetch(`/api/recipes/by-id/${recipeId}/save`, {
        method: 'POST',
        headers: getAuthHeaders(),
      })
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
      <!-- Page Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-display text-neutral-700 dark:text-neutral-50">
          Browse Recipes
        </h1>
        <p class="text-neutral-500 dark:text-neutral-400 mt-1">
          Discover delicious recipes from home cooks
        </p>
      </div>

      <!-- Toolbar: Search, Sort, View Toggle, Filters -->
      <div class="flex flex-wrap items-center gap-3 mb-6">
        <BrowseSearchBar v-model="searchQuery" />

        <div class="flex items-center gap-2">
          <BrowseSortDropdown v-model="sortBy" />
          <BrowseViewToggle v-model="viewMode" />

          <!-- Mobile Filter Button -->
          <UButton
            class="lg:hidden press-effect"
            color="neutral"
            variant="outline"
            icon="i-heroicons-funnel"
            :badge="hasActiveFilters ? activeFilters.length : undefined"
            @click="showFilterDrawer = true"
          >
            Filters
          </UButton>
        </div>
      </div>

      <!-- Active Filters -->
      <BrowseActiveFilters
        :filters="activeFilters"
        class="mb-6"
        @remove="removeFilter"
        @clear-all="clearAllFilters"
      />

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

      <!-- Empty State (no public recipes at all) -->
      <EmptyState
        v-else-if="allRecipes.length === 0"
        type="recipes"
        title="No recipes yet"
        description="Be the first to share a recipe with the community!"
        action-label="Add Recipe"
        action-to="/recipes/new"
      />

      <!-- Main Content Area with Sidebar -->
      <div
        v-else
        class="flex gap-8"
      >
        <!-- Desktop Filter Sidebar -->
        <BrowseFilterSidebar
          v-model="filters"
          class="hidden lg:block"
        />

        <!-- Recipe Grid/List -->
        <div class="flex-1 min-w-0">
          <!-- No Results (filters applied but nothing matches) -->
          <EmptyState
            v-if="recipes.length === 0"
            type="search"
            title="No recipes found"
            description="Try adjusting your search or filters to find what you're looking for."
          >
            <UButton
              color="primary"
              variant="soft"
              @click="clearAllFilters"
            >
              Clear all filters
            </UButton>
          </EmptyState>

          <!-- Grid View -->
          <div
            v-else-if="effectiveViewMode === 'grid'"
            class="grid md:grid-cols-2 xl:grid-cols-3 gap-6"
          >
            <BrowseRecipeCard
              v-for="recipe in recipes"
              :key="recipe.id"
              :recipe="recipe"
              view="grid"
              @save="handleSave"
              @add-to-collection="handleAddToCollection"
            />
          </div>

          <!-- List View -->
          <div
            v-else
            class="space-y-4"
          >
            <BrowseRecipeCard
              v-for="recipe in recipes"
              :key="recipe.id"
              :recipe="recipe"
              view="list"
              @save="handleSave"
              @add-to-collection="handleAddToCollection"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile Filter Drawer -->
    <USlideover
      v-model:open="showFilterDrawer"
      title="Filters"
      description="Filter recipes by time, servings, and categories"
    >
      <template #content>
        <div class="flex flex-col h-full">
          <!-- Fixed Header -->
          <div class="flex-shrink-0 flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
            <h2 class="text-lg font-display text-neutral-700 dark:text-neutral-100">
              Filters
            </h2>
            <UButton
              icon="i-heroicons-x-mark"
              color="neutral"
              variant="ghost"
              @click="showFilterDrawer = false"
            />
          </div>

          <!-- Scrollable Content -->
          <div class="flex-1 overflow-y-auto p-4">
            <BrowseFilterSidebar
              v-model="filters"
              class="!w-full [&>div]:!static [&>div]:!bg-transparent [&>div]:!p-0"
            />
          </div>

          <!-- Fixed Footer -->
          <div class="flex-shrink-0 p-4 border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
            <UButton
              color="primary"
              block
              @click="showFilterDrawer = false"
            >
              Show {{ recipes.length }} Results
            </UButton>
          </div>
        </div>
      </template>
    </USlideover>

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
          <!-- Decorative header -->
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
