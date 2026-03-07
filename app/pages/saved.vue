<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

useSeoMeta({
  title: 'Saved Recipes',
  description: 'Your saved recipes collection',
})

const { getAuthHeaders } = useAuth()

interface RecipeCategory {
  id: number
  name: string
  slug: string
  icon: string | null
  type: string
}

interface SavedRecipe {
  id: number
  slug: string
  title: string
  description: string | null
  coverPhoto: string | null
  prepTime: number | null
  cookTime: number | null
  servings: number | null
  saveCount: number | null
  savedAt: string
  author: { name: string; username: string | null } | null
  categories?: RecipeCategory[]
}

const { data, status } = await useFetch<{ recipes: SavedRecipe[] }>('/api/saves', {
  headers: getAuthHeaders(),
})

const savedRecipes = computed(() => data.value?.recipes || [])

// View preferences
const viewMode = ref<'grid' | 'list'>('grid')
const sortBy = ref<'newest-saved' | 'oldest-saved' | 'a-z' | 'z-a' | 'cook-time'>('newest-saved')
const searchQuery = ref('')

// Track hydration state to avoid SSR/client mismatch
const isHydrated = ref(false)

// Use effective values that only change after hydration
const effectiveViewMode = computed(() => isHydrated.value ? viewMode.value : 'grid')

// Filters
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

// Mobile filter drawer
const showFilterDrawer = ref(false)

// Load preferences from localStorage
// Use nextTick to wait for hydration to complete before applying localStorage preferences
onMounted(async () => {
  await nextTick()
  const savedView = localStorage.getItem('saved-view')
  const savedSort = localStorage.getItem('saved-sort')
  if (savedView === 'grid' || savedView === 'list') viewMode.value = savedView
  if (savedSort) sortBy.value = savedSort as typeof sortBy.value
  isHydrated.value = true
})

// Save preferences to localStorage
watch(viewMode, (val) => localStorage.setItem('saved-view', val))
watch(sortBy, (val) => localStorage.setItem('saved-sort', val))

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

// Filtered and sorted recipes
const filteredRecipes = computed(() => {
  let result = [...savedRecipes.value]

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

  // Category filter
  if (filters.value.categories.length > 0) {
    result = result.filter(r => {
      if (!r.categories || r.categories.length === 0) return false
      return r.categories.some(c => filters.value.categories.includes(c.slug))
    })
  }

  // Sorting - only apply after hydration to avoid mismatch between SSR and client
  // During SSR and initial hydration, use API's default order (newest-saved)
  if (isHydrated.value && sortBy.value !== 'newest-saved') {
    result.sort((a, b) => {
      let primarySort = 0
      switch (sortBy.value) {
        case 'oldest-saved':
          primarySort = new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime()
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
      }
      // Secondary sort by id for stable ordering when primary sort values are equal
      return primarySort !== 0 ? primarySort : b.id - a.id
    })
  }

  return result
})

// Sort options
const sortOptions = [
  { value: 'newest-saved', label: 'Recently Saved', icon: 'i-heroicons-clock' },
  { value: 'oldest-saved', label: 'Oldest Saved', icon: 'i-heroicons-clock' },
  { value: 'a-z', label: 'A to Z', icon: 'i-heroicons-bars-arrow-down' },
  { value: 'z-a', label: 'Z to A', icon: 'i-heroicons-bars-arrow-up' },
  { value: 'cook-time', label: 'Cook Time', icon: 'i-heroicons-fire' },
]

const currentSortOption = computed(() => sortOptions.find(o => o.value === sortBy.value))

const sortMenuItems = computed(() => [
  sortOptions.map(option => ({
    label: option.label,
    icon: option.icon,
    onSelect: (): void => { sortBy.value = option.value as typeof sortBy.value },
    active: sortBy.value === option.value,
  })),
])

// Unsave recipe
async function handleUnsave(recipeId: number): Promise<void> {
  if (!data.value) return

  // Store the recipe and its index for potential rollback
  const recipeIndex = data.value.recipes.findIndex((r) => r.id === recipeId)
  if (recipeIndex === -1) return
  const removedRecipe = data.value.recipes[recipeIndex]
  if (!removedRecipe) return

  // Optimistic update - remove from list immediately
  data.value.recipes.splice(recipeIndex, 1)

  try {
    await $fetch(`/api/recipes/by-id/${recipeId}/save`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })
  } catch (err) {
    // Revert on error - add back to same position
    data.value.recipes.splice(recipeIndex, 0, removedRecipe)
    console.error('Failed to unsave recipe:', err)
  }
}

// Collection picker
const showCollectionPicker = ref(false)
const selectedRecipeForCollection = ref<number | null>(null)

function handleAddToCollection(recipeId: number): void {
  selectedRecipeForCollection.value = recipeId
  showCollectionPicker.value = true
}
</script>

<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950">
    <div class="max-w-6xl mx-auto px-4 py-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-display text-neutral-700 dark:text-neutral-50">
            Saved Recipes
          </h1>
          <p class="text-neutral-500 dark:text-neutral-400 mt-1">
            {{ filteredRecipes.length }}
            <template v-if="filteredRecipes.length !== savedRecipes.length">
              of {{ savedRecipes.length }}
            </template>
            saved recipe{{ savedRecipes.length === 1 ? '' : 's' }}
          </p>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="flex flex-wrap items-center gap-3 mb-6">
        <div class="relative flex-1 max-w-md">
          <UInput
            v-model="searchQuery"
            placeholder="Search saved recipes..."
            icon="i-heroicons-magnifying-glass"
            class="w-full"
          />
        </div>

        <div class="flex items-center gap-2">
          <UDropdownMenu :items="sortMenuItems">
            <UButton
              color="neutral"
              variant="outline"
              class="press-effect"
            >
              <UIcon
                :name="currentSortOption?.icon || 'i-heroicons-arrows-up-down'"
                class="w-4 h-4"
              />
              <span class="hidden sm:inline">{{ currentSortOption?.label || 'Sort' }}</span>
              <UIcon
                name="i-heroicons-chevron-down"
                class="w-4 h-4"
              />
            </UButton>
          </UDropdownMenu>

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

      <!-- Empty State -->
      <EmptyState
        v-else-if="savedRecipes.length === 0"
        type="saved"
        title="No saved recipes yet"
        description="Browse recipes and click the bookmark icon to save them here for easy access."
        action-label="Browse Recipes"
        action-icon="i-heroicons-magnifying-glass"
        action-to="/browse"
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
          <!-- No Results -->
          <EmptyState
            v-if="filteredRecipes.length === 0"
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
              v-for="recipe in filteredRecipes"
              :key="recipe.id"
              :recipe="{ ...recipe, isSaved: true }"
              view="grid"
              @save="handleUnsave"
              @add-to-collection="handleAddToCollection"
            />
          </div>

          <!-- List View -->
          <div
            v-else
            class="space-y-4"
          >
            <BrowseRecipeCard
              v-for="recipe in filteredRecipes"
              :key="recipe.id"
              :recipe="{ ...recipe, isSaved: true }"
              view="list"
              @save="handleUnsave"
              @add-to-collection="handleAddToCollection"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Collection Picker Modal -->
    <CollectionsCollectionPickerModal
      v-model:open="showCollectionPicker"
      :recipe-id="selectedRecipeForCollection"
    />

    <!-- Mobile Filter Drawer -->
    <USlideover
      v-model:open="showFilterDrawer"
      title="Filters"
      description="Filter saved recipes by time, servings, and categories"
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
              Show {{ filteredRecipes.length }} Results
            </UButton>
          </div>
        </div>
      </template>
    </USlideover>
  </div>
</template>
