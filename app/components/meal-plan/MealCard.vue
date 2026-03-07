<script setup lang="ts">
interface RecipePreview {
  id: number
  title: string
  slug: string
  coverPhoto: string | null
  prepTime: number | null
  cookTime: number | null
  servings: number | null
  author?: { username: string | null } | null
}

interface Props {
  planId: number
  recipe: RecipePreview
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
}

const props = defineProps<Props>()
const emit = defineEmits<{
  remove: [planId: number]
}>()

const { getRecipeUrl } = useRecipeUrl()

const recipeUrl = computed(() => getRecipeUrl(props.recipe))

const totalTime = computed(() => {
  const total = (props.recipe.prepTime || 0) + (props.recipe.cookTime || 0)
  if (!total) return null
  if (total < 60) return `${total}m`
  const hours = Math.floor(total / 60)
  const mins = total % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
})

const mealTypeColor = computed(() => {
  switch (props.mealType) {
    case 'breakfast': return 'bg-butter-100 dark:bg-butter-900/30 border-butter-200 dark:border-butter-800'
    case 'lunch': return 'bg-primary-50 dark:bg-primary-900/30 border-primary-200 dark:border-primary-800'
    case 'dinner': return 'bg-sage-50 dark:bg-sage-900/30 border-sage-200 dark:border-sage-800'
    case 'snack': return 'bg-terracotta-50 dark:bg-terracotta-900/30 border-terracotta-200 dark:border-terracotta-800'
    default: return 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'
  }
})
</script>

<template>
  <div
    class="group relative rounded-lg border overflow-hidden transition-all duration-200 hover:shadow-md cursor-grab active:cursor-grabbing"
    :class="mealTypeColor"
  >
    <!-- Drag Handle (visible area) -->
    <NuxtLink
      :to="recipeUrl"
      class="block p-2"
    >
      <div class="flex gap-2">
        <!-- Thumbnail -->
        <div
          v-if="recipe.coverPhoto"
          class="flex-shrink-0 w-10 h-10 rounded overflow-hidden"
        >
          <img
            :src="recipe.coverPhoto"
            :alt="recipe.title"
            class="w-full h-full object-cover"
          >
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-neutral-700 dark:text-neutral-100 line-clamp-2 leading-tight">
            {{ recipe.title }}
          </p>
          <p
            v-if="totalTime"
            class="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 flex items-center gap-1"
          >
            <UIcon
              name="i-heroicons-clock"
              class="w-3 h-3"
            />
            {{ totalTime }}
          </p>
        </div>
      </div>
    </NuxtLink>

    <!-- Remove Button -->
    <button
      type="button"
      class="absolute top-1 right-1 p-1 opacity-60 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-error-500 hover:bg-error-100 dark:hover:bg-error-900/30 rounded z-20"
      aria-label="Remove from meal plan"
      @click.stop.prevent="emit('remove', planId)"
    >
      <UIcon
        name="i-heroicons-x-mark"
        class="w-3.5 h-3.5"
      />
    </button>
  </div>
</template>
