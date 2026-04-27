<script setup lang="ts">
// Custom interface matching the component's expected recipe shape
interface MyRecipe {
  id: number
  title: string
  slug: string
  description: string | null
  coverPhoto: string | null
  prepTime: number | null
  cookTime: number | null
  servings: number | null
  isPublished: boolean | null
  saveCount: number | null
  isSaved: boolean
  createdAt: string
  author: {
    id: string
    username: string | null
    name: string
  } | null
}

const recipeService = useRecipeService()

const { data, status } = await useAsyncData('my-recipes', async () => {
  const recipes = await recipeService.getMyRecipes()
  // Transform snake_case to camelCase for compatibility with existing template
  const transformedRecipes: MyRecipe[] = recipes.map(r => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    description: r.description,
    coverPhoto: r.cover_photo,
    prepTime: r.prep_time,
    cookTime: r.cook_time,
    servings: r.servings,
    isPublished: r.is_published,
    saveCount: r.save_count,
    isSaved: r.is_saved ?? false,
    createdAt: r.created_at,
    author: r.author ? {
      id: r.author.id,
      username: r.author.username,
      name: r.author.name,
    } : null,
  }))
  return { recipes: transformedRecipes }
})

const recipes = computed(() => data.value?.recipes || [])

// View preferences (persisted to localStorage)
const viewMode = ref<'grid' | 'list'>('grid')
const sortBy = ref<'newest' | 'oldest' | 'a-z' | 'z-a' | 'cook-time' | 'prep-time'>('newest')
const searchQuery = ref('')

// Load preferences from localStorage
onMounted(() => {
  const savedView = localStorage.getItem('recipes-view')
  const savedSort = localStorage.getItem('recipes-sort')
  if (savedView === 'grid' || savedView === 'list') viewMode.value = savedView
  if (savedSort) sortBy.value = savedSort as typeof sortBy.value
})

// Save preferences to localStorage
watch(viewMode, (val) => localStorage.setItem('recipes-view', val))
watch(sortBy, (val) => localStorage.setItem('recipes-sort', val))

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
  }
}

function clearAllFilters(): void {
  filters.value = { maxTime: null, minServings: null, maxServings: null, categories: [] }
  searchQuery.value = ''
}

// Computed: filtered and sorted recipes
const filteredRecipes = computed(() => {
  let result = [...recipes.value]

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(r =>
      r.title.toLowerCase().includes(query) ||
      r.description?.toLowerCase().includes(query)
    )
  }

  // Time filter
  const maxTime = filters.value.maxTime
  if (maxTime) {
    result = result.filter(r => {
      const total = (r.prepTime || 0) + (r.cookTime || 0)
      return total <= maxTime
    })
  }

  // Servings filter
  const minServings = filters.value.minServings
  if (minServings !== null) {
    result = result.filter(r => {
      if (!r.servings) return false
      if (r.servings < minServings) return false
      if (filters.value.maxServings && r.servings > filters.value.maxServings) return false
      return true
    })
  }

  // Sorting - add secondary sort by id for stable ordering
  result.sort((a, b) => {
    let primarySort = 0
    switch (sortBy.value) {
      case 'newest':
        primarySort = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
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

  return result
})

const hasActiveFilters = computed(() =>
  filters.value.maxTime !== null ||
  filters.value.minServings !== null ||
  filters.value.categories.length > 0 ||
  searchQuery.value !== ''
)

// Actions
async function handleSave(recipeId: number): Promise<void> {
  // Find the recipe in the data
  if (!data.value) return
  const recipeIndex = data.value.recipes.findIndex((r) => r.id === recipeId)
  if (recipeIndex === -1) return

  const recipe = data.value.recipes[recipeIndex]
  if (!recipe) return

  const wasSaved = recipe.isSaved ?? false
  const originalSaveCount = recipe.saveCount

  // Optimistic update
  recipe.isSaved = !wasSaved
  recipe.saveCount = (originalSaveCount ?? 0) + (wasSaved ? -1 : 1)

  try {
    if (wasSaved) {
      await recipeService.unsaveRecipe(recipeId)
    } else {
      await recipeService.saveRecipe(recipeId)
    }
  } catch (err) {
    // Revert on error
    recipe.isSaved = wasSaved
    recipe.saveCount = originalSaveCount
    console.error('Failed to toggle save:', err)
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
  <div>
    <!-- Page Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-display text-neutral-700 dark:text-neutral-50">
          My Recipes
        </h2>
        <p class="text-neutral-500 dark:text-neutral-400 mt-1">
          {{ filteredRecipes.length }}
          <template v-if="filteredRecipes.length !== recipes.length">
            of {{ recipes.length }}
          </template>
          recipe{{ recipes.length === 1 ? '' : 's' }}
        </p>
      </div>
      <UButton
        to="/recipes/new"
        color="primary"
        icon="i-heroicons-plus"
        class="press-effect"
      >
        New Recipe
      </UButton>
    </div>

    <!-- Toolbar: Search, Sort, View Toggle, Filters (mobile) -->
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

    <!-- Empty State (no recipes at all) -->
    <EmptyState
      v-else-if="recipes.length === 0"
      type="recipes"
      title="No recipes yet"
      description="Start building your collection by adding your first recipe."
      action-label="Add Your First Recipe"
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
          v-else-if="viewMode === 'grid'"
          class="grid md:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          <BrowseRecipeCard
            v-for="recipe in filteredRecipes"
            :key="recipe.id"
            :recipe="recipe"
            view="grid"
            show-edit
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
            v-for="recipe in filteredRecipes"
            :key="recipe.id"
            :recipe="recipe"
            view="list"
            show-edit
            @save="handleSave"
            @add-to-collection="handleAddToCollection"
          />
        </div>
      </div>
    </div>

    <!-- Mobile Filter Drawer -->
    <USlideover
      v-model:open="showFilterDrawer"
      title="Filters"
      description="Filter your recipes by time, servings, and categories"
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

    <!-- Collection Picker Modal -->
    <CollectionsCollectionPickerModal
      v-model:open="showCollectionPicker"
      :recipe-id="selectedRecipeForCollection"
    />
  </div>
</template>
