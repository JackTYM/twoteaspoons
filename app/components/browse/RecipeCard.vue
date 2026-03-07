<script setup lang="ts">
interface RecipeCategory {
  id: number
  name: string
  slug: string
  icon: string | null
  type: string
}

// Simplified recipe type for browse cards - doesn't need full relations
interface BrowseRecipe {
  id: number
  slug: string
  title: string
  description: string | null
  coverPhoto: string | null
  prepTime: number | null
  cookTime: number | null
  servings: number | null
  saveCount?: number | null
  isSaved?: boolean
  categories?: RecipeCategory[]
  author?: { name: string; username: string | null } | null
}

interface Props {
  recipe: BrowseRecipe
  view?: 'grid' | 'list'
  showEdit?: boolean
  showSaveCount?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  view: 'grid',
  showEdit: false,
  showSaveCount: true,
})

const emit = defineEmits<{
  save: [recipeId: number]
  addToCollection: [recipeId: number]
}>()

function handleSaveClick(): void {
  emit('save', props.recipe.id)
}

function handleCollectionClick(): void {
  emit('addToCollection', props.recipe.id)
}

const { getRecipeUrl, getRecipeEditUrl } = useRecipeUrl()

const recipeUrl = computed(() => getRecipeUrl(props.recipe))
const editUrl = computed(() => getRecipeEditUrl(props.recipe))

function navigateToEdit(): void {
  navigateTo(editUrl.value)
}

function navigateToAuthor(): void {
  if (props.recipe.author?.username) {
    navigateTo(`/users/${props.recipe.author.username}`)
  }
}

function formatTime(minutes: number | null): string {
  if (!minutes) return ''
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

const totalTime = computed(() => {
  const total = (props.recipe.prepTime || 0) + (props.recipe.cookTime || 0)
  return formatTime(total)
})

// Get top categories to display (max 3, prioritized by type)
const displayCategories = computed(() => {
  if (!props.recipe.categories?.length) return []

  // Priority order: dietary, style, meal, cuisine, dish, protein, occasion, season
  const priorityOrder = ['dietary', 'style', 'meal', 'cuisine', 'dish', 'protein', 'occasion', 'season']

  const sorted = [...props.recipe.categories].sort((a, b) => {
    const aIndex = priorityOrder.indexOf(a.type)
    const bIndex = priorityOrder.indexOf(b.type)
    return aIndex - bIndex
  })

  return sorted.slice(0, 3)
})

const remainingCategoryCount = computed(() => {
  const total = props.recipe.categories?.length || 0
  return Math.max(0, total - 3)
})

// Get category chip color based on type
function getCategoryColor(type: string): string {
  switch (type) {
    case 'dietary':
      return 'bg-sage-100 dark:bg-sage-900/50 text-sage-700 dark:text-sage-300'
    case 'style':
      return 'bg-butter-100 dark:bg-butter-900/50 text-butter-700 dark:text-butter-300'
    case 'meal':
      return 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300'
    default:
      return 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
  }
}
</script>

<template>
  <NuxtLink
    :to="recipeUrl"
    class="group block"
  >
    <!-- Grid View -->
    <div
      v-if="view === 'grid'"
      class="relative overflow-hidden rounded-xl bg-neutral-50 dark:bg-neutral-800 hover-lift transition-all duration-200 h-full"
    >
      <!-- Cover Photo -->
      <div class="aspect-[4/3] relative overflow-hidden">
        <img
          v-if="recipe.coverPhoto"
          :src="recipe.coverPhoto"
          :alt="recipe.title"
          class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        >
        <RecipePlaceholder
          v-else
          variant="default"
          class="w-full h-full"
        />

        <!-- Gradient Overlay (on hover) -->
        <div class="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

        <!-- Quick Actions (appear on hover) -->
        <div class="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-200 translate-y-1 group-hover:translate-y-0 z-10">
          <UButton
            v-if="showEdit"
            icon="i-heroicons-pencil"
            color="neutral"
            variant="solid"
            size="sm"
            class="bg-white/90 hover:bg-white text-neutral-700 shadow-lg press-effect"
            aria-label="Edit recipe"
            @click.stop.prevent="navigateToEdit"
          />
          <UButton
            :icon="recipe.isSaved ? 'i-heroicons-bookmark-solid' : 'i-heroicons-bookmark'"
            color="neutral"
            variant="solid"
            size="sm"
            :class="[
              'shadow-lg press-effect',
              recipe.isSaved
                ? 'bg-primary-500 hover:bg-primary-600 text-white'
                : 'bg-white/90 hover:bg-white text-neutral-700'
            ]"
            :aria-label="recipe.isSaved ? 'Remove from saved' : 'Save recipe'"
            @click.stop.prevent="handleSaveClick"
          />
          <UButton
            icon="i-heroicons-folder-plus"
            color="neutral"
            variant="solid"
            size="sm"
            class="bg-white/90 hover:bg-white text-neutral-700 shadow-lg press-effect"
            aria-label="Add to collection"
            @click.stop.prevent="handleCollectionClick"
          />
        </div>

        <!-- Save Count Badge -->
        <div
          v-if="showSaveCount && recipe.saveCount && recipe.saveCount > 0"
          class="absolute top-3 left-3 px-2 py-1 bg-white/90 dark:bg-neutral-800/90 rounded-full text-sm flex items-center gap-1 backdrop-blur-sm shadow-sm"
        >
          <UIcon
            name="i-heroicons-bookmark"
            class="w-3.5 h-3.5 text-primary-500"
          />
          <span class="font-medium text-neutral-700 dark:text-neutral-100">
            {{ recipe.saveCount }}
          </span>
        </div>
      </div>

      <!-- Content -->
      <div class="p-4">
        <h3 class="font-display text-lg text-neutral-700 dark:text-neutral-100 mb-1 line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
          {{ recipe.title }}
        </h3>
        <p
          v-if="recipe.description"
          class="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2 mb-2"
        >
          {{ recipe.description }}
        </p>

        <!-- Category Chips -->
        <div
          v-if="displayCategories.length > 0"
          class="flex flex-wrap gap-1.5 mb-3"
        >
          <span
            v-for="category in displayCategories"
            :key="category.id"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
            :class="getCategoryColor(category.type)"
          >
            {{ category.name }}
          </span>
          <span
            v-if="remainingCategoryCount > 0"
            class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400"
          >
            +{{ remainingCategoryCount }}
          </span>
        </div>

        <!-- Meta Row -->
        <div class="flex items-center justify-between text-sm text-neutral-500 dark:text-neutral-400">
          <div class="flex items-center gap-3">
            <span
              v-if="totalTime"
              class="flex items-center gap-1"
            >
              <UIcon
                name="i-heroicons-clock"
                class="w-4 h-4"
              />
              {{ totalTime }}
            </span>
            <span
              v-if="recipe.servings"
              class="flex items-center gap-1"
            >
              <UIcon
                name="i-heroicons-users"
                class="w-4 h-4"
              />
              {{ recipe.servings }}
            </span>
          </div>
          <button
            v-if="recipe.author?.username"
            type="button"
            class="text-xs hover:text-primary-600 dark:hover:text-primary-400 transition-colors truncate max-w-[100px]"
            @click.stop.prevent="navigateToAuthor"
          >
            by {{ recipe.author.name }}
          </button>
        </div>
      </div>
    </div>

    <!-- List View -->
    <div
      v-else
      class="flex gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800 hover-lift transition-all duration-200"
    >
      <!-- Cover Photo -->
      <div class="flex-shrink-0 w-20 h-16 sm:w-32 sm:h-24 rounded-lg overflow-hidden">
        <img
          v-if="recipe.coverPhoto"
          :src="recipe.coverPhoto"
          :alt="recipe.title"
          class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        >
        <RecipePlaceholder
          v-else
          variant="default"
          class="w-full h-full"
        />
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <h3 class="font-display text-lg text-neutral-700 dark:text-neutral-100 mb-1 line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
          {{ recipe.title }}
        </h3>
        <p
          v-if="recipe.description"
          class="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2 mb-2"
        >
          {{ recipe.description }}
        </p>

        <!-- Category Chips (list view) -->
        <div
          v-if="displayCategories.length > 0"
          class="flex flex-wrap gap-1 mb-2"
        >
          <span
            v-for="category in displayCategories"
            :key="category.id"
            class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
            :class="getCategoryColor(category.type)"
          >
            {{ category.name }}
          </span>
          <span
            v-if="remainingCategoryCount > 0"
            class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400"
          >
            +{{ remainingCategoryCount }}
          </span>
        </div>

        <!-- Meta Row -->
        <div class="flex items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400">
          <span
            v-if="totalTime"
            class="flex items-center gap-1"
          >
            <UIcon
              name="i-heroicons-clock"
              class="w-4 h-4"
            />
            {{ totalTime }}
          </span>
          <span
            v-if="recipe.servings"
            class="flex items-center gap-1"
          >
            <UIcon
              name="i-heroicons-users"
              class="w-4 h-4"
            />
            {{ recipe.servings }} servings
          </span>
          <button
            v-if="recipe.author?.username"
            type="button"
            class="hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            @click.stop.prevent="navigateToAuthor"
          >
            by {{ recipe.author.name }}
          </button>
        </div>
      </div>

      <!-- Save Count (list view) -->
      <div
        v-if="showSaveCount && recipe.saveCount && recipe.saveCount > 0"
        class="flex-shrink-0 flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400"
      >
        <UIcon
          name="i-heroicons-bookmark"
          class="w-4 h-4 text-primary-500"
        />
        {{ recipe.saveCount }}
      </div>

      <!-- Quick Actions -->
      <div class="flex-shrink-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-10">
        <UButton
          v-if="showEdit"
          icon="i-heroicons-pencil"
          color="neutral"
          variant="ghost"
          size="sm"
          class="press-effect"
          aria-label="Edit recipe"
          @click.stop.prevent="navigateToEdit"
        />
        <UButton
          :icon="recipe.isSaved ? 'i-heroicons-bookmark-solid' : 'i-heroicons-bookmark'"
          :color="recipe.isSaved ? 'primary' : 'neutral'"
          variant="ghost"
          size="sm"
          class="press-effect"
          :aria-label="recipe.isSaved ? 'Remove from saved' : 'Save recipe'"
          @click.stop.prevent="handleSaveClick"
        />
        <UButton
          icon="i-heroicons-folder-plus"
          color="neutral"
          variant="ghost"
          size="sm"
          class="press-effect"
          aria-label="Add to collection"
          @click.stop.prevent="handleCollectionClick"
        />
      </div>
    </div>
  </NuxtLink>
</template>
