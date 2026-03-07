<script setup lang="ts">
interface RecipePreview {
  id: number
  title: string
  coverPhoto: string | null
  prepTime: number | null
  cookTime: number | null
  servings: number | null
}

interface Props {
  open: boolean
  date: Date | null
  mealType: string
  recipes: RecipePreview[]
  loading: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  select: [recipeId: number]
}>()

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
})

const searchQuery = ref('')

const filteredRecipes = computed(() => {
  if (!searchQuery.value) return props.recipes
  const query = searchQuery.value.toLowerCase()
  return props.recipes.filter(r =>
    r.title.toLowerCase().includes(query)
  )
})

const dayLabel = computed(() => {
  if (!props.date) return ''
  return props.date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
})

const mealTypeLabel = computed(() => {
  return props.mealType.charAt(0).toUpperCase() + props.mealType.slice(1)
})

function formatTime(recipe: RecipePreview): string | null {
  const total = (recipe.prepTime || 0) + (recipe.cookTime || 0)
  if (!total) return null
  if (total < 60) return `${total}m`
  const hours = Math.floor(total / 60)
  const mins = total % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

function selectRecipe(recipeId: number): void {
  emit('select', recipeId)
}

// Focus search on open
const searchInput = ref<HTMLInputElement | null>(null)
watch(isOpen, (open) => {
  if (open) {
    searchQuery.value = ''
    nextTick(() => searchInput.value?.focus())
  }
})
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="`Add ${mealTypeLabel}`"
    :description="dayLabel"
  >
    <template #content>
      <div class="p-6 max-h-[80vh] flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-lg font-display text-neutral-700 dark:text-neutral-100">
              Add {{ mealTypeLabel }}
            </h3>
            <p class="text-sm text-neutral-500 dark:text-neutral-400">
              {{ dayLabel }}
            </p>
          </div>
          <UButton
            icon="i-heroicons-x-mark"
            color="neutral"
            variant="ghost"
            @click="isOpen = false"
          />
        </div>

        <!-- Search -->
        <div class="relative mb-4">
          <UIcon
            name="i-heroicons-magnifying-glass"
            class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400"
          />
          <input
            ref="searchInput"
            v-model="searchQuery"
            type="text"
            placeholder="Search recipes..."
            class="w-full pl-10 pr-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 border-0 rounded-xl text-neutral-700 dark:text-neutral-200 placeholder-neutral-400 focus:ring-2 focus:ring-primary-500 transition-all"
          >
        </div>

        <!-- Recipe Grid -->
        <div class="flex-1 overflow-y-auto -mx-2 px-2">
          <div
            v-if="filteredRecipes.length === 0"
            class="text-center py-8"
          >
            <UIcon
              name="i-heroicons-magnifying-glass"
              class="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3"
            />
            <p class="text-neutral-500 dark:text-neutral-400">
              No recipes found
            </p>
            <UButton
              to="/recipes/new"
              color="primary"
              variant="soft"
              size="sm"
              class="mt-3"
            >
              Create a recipe
            </UButton>
          </div>

          <div
            v-else
            class="grid grid-cols-2 gap-3"
          >
            <button
              v-for="recipe in filteredRecipes"
              :key="recipe.id"
              type="button"
              class="text-left p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border-2 border-transparent hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all press-effect"
              :disabled="loading"
              @click="selectRecipe(recipe.id)"
            >
              <div class="flex gap-3">
                <!-- Thumbnail -->
                <div class="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-700">
                  <img
                    v-if="recipe.coverPhoto"
                    :src="recipe.coverPhoto"
                    :alt="recipe.title"
                    class="w-full h-full object-cover"
                  >
                  <div
                    v-else
                    class="w-full h-full flex items-center justify-center"
                  >
                    <UIcon
                      name="i-heroicons-photo"
                      class="w-6 h-6 text-neutral-400"
                    />
                  </div>
                </div>

                <!-- Content -->
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-neutral-700 dark:text-neutral-100 line-clamp-2">
                    {{ recipe.title }}
                  </p>
                  <div class="flex items-center gap-3 mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    <span
                      v-if="formatTime(recipe)"
                      class="flex items-center gap-1"
                    >
                      <UIcon
                        name="i-heroicons-clock"
                        class="w-3 h-3"
                      />
                      {{ formatTime(recipe) }}
                    </span>
                    <span
                      v-if="recipe.servings"
                      class="flex items-center gap-1"
                    >
                      <UIcon
                        name="i-heroicons-users"
                        class="w-3 h-3"
                      />
                      {{ recipe.servings }}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
