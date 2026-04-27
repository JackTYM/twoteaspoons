<script setup lang="ts">
defineEmits<{
  switchTab: [tab: string]
}>()

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
}

const recipeService = useRecipeService()

const { data, status } = await useAsyncData('saved-recipes', async () => {
  const recipes = await recipeService.getSavedRecipes()
  // Transform snake_case to camelCase for compatibility with existing template
  const transformedRecipes: SavedRecipe[] = recipes.map(r => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    description: r.description,
    coverPhoto: r.cover_photo,
    prepTime: r.prep_time,
    cookTime: r.cook_time,
    servings: r.servings,
    saveCount: r.save_count,
    // For saved recipes, we can use created_at as savedAt since getSavedRecipes
    // returns them in order of when they were saved
    savedAt: r.created_at,
    author: r.author ? { name: r.author.name, username: r.author.username } : null,
  }))
  return { recipes: transformedRecipes }
})

const savedRecipes = computed(() => data.value?.recipes || [])

// View preferences
const viewMode = ref<'grid' | 'list'>('grid')
const sortBy = ref<'newest-saved' | 'oldest-saved' | 'a-z' | 'z-a'>('newest-saved')
const searchQuery = ref('')

// Load preferences from localStorage
onMounted(() => {
  const savedView = localStorage.getItem('saved-view')
  const savedSort = localStorage.getItem('saved-sort')
  if (savedView === 'grid' || savedView === 'list') viewMode.value = savedView
  if (savedSort) sortBy.value = savedSort as typeof sortBy.value
})

// Save preferences to localStorage
watch(viewMode, (val) => localStorage.setItem('saved-view', val))
watch(sortBy, (val) => localStorage.setItem('saved-sort', val))

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

  // Sorting - add secondary sort by id for stable ordering
  result.sort((a, b) => {
    let primarySort = 0
    switch (sortBy.value) {
      case 'newest-saved':
        primarySort = new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
        break
      case 'oldest-saved':
        primarySort = new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime()
        break
      case 'a-z':
        primarySort = a.title.localeCompare(b.title)
        break
      case 'z-a':
        primarySort = b.title.localeCompare(a.title)
        break
    }
    // Secondary sort by id for stable ordering when primary sort values are equal
    return primarySort !== 0 ? primarySort : b.id - a.id
  })

  return result
})

// Sort options
const sortOptions = [
  { value: 'newest-saved', label: 'Recently Saved', icon: 'i-heroicons-clock' },
  { value: 'oldest-saved', label: 'Oldest Saved', icon: 'i-heroicons-clock' },
  { value: 'a-z', label: 'A to Z', icon: 'i-heroicons-bars-arrow-down' },
  { value: 'z-a', label: 'Z to A', icon: 'i-heroicons-bars-arrow-up' },
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
    await recipeService.unsaveRecipe(recipeId)
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
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-display text-neutral-700 dark:text-neutral-50">
          Saved Recipes
        </h2>
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
      </div>
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
      v-else-if="savedRecipes.length === 0"
      type="saved"
      title="No saved recipes yet"
      description="Browse recipes and click the bookmark icon to save them here for easy access."
      action-label="Browse Recipes"
      action-icon="i-heroicons-magnifying-glass"
      @action="$emit('switchTab', 'browse')"
    />

    <!-- No Results -->
    <EmptyState
      v-else-if="filteredRecipes.length === 0"
      type="search"
      title="No recipes found"
      description="Try a different search term."
    >
      <UButton
        color="primary"
        variant="soft"
        @click="searchQuery = ''"
      >
        Clear search
      </UButton>
    </EmptyState>

    <!-- Grid View -->
    <div
      v-else-if="viewMode === 'grid'"
      class="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
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

    <!-- Collection Picker Modal -->
    <CollectionsCollectionPickerModal
      v-model:open="showCollectionPicker"
      :recipe-id="selectedRecipeForCollection"
    />
  </div>
</template>
