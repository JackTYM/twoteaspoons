<script setup lang="ts">
interface ImportedRecipe {
  title: string
  description?: string
  coverPhoto?: string
  prepTime?: number
  cookTime?: number
  servings?: number
  sourceSite?: string
  ingredients?: Array<{ item: string }>
  instructions?: Array<{ content: string }>
}

interface Props {
  recipe: ImportedRecipe
}

const props = defineProps<Props>()

const emit = defineEmits<{
  continue: []
}>()

function formatTime(minutes: number | null | undefined): string {
  if (!minutes) return ''
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins ? `${hours}h ${mins}m` : `${hours}h`
}

const totalTime = computed(() => {
  const total = (props.recipe.prepTime || 0) + (props.recipe.cookTime || 0)
  return formatTime(total)
})
</script>

<template>
  <div class="text-center py-6">
    <!-- Success animation -->
    <div class="w-20 h-20 mx-auto bg-sage-100 dark:bg-sage-900/30 rounded-full flex items-center justify-center mb-4 animate-scale-in">
      <UIcon
        name="i-heroicons-check"
        class="w-10 h-10 text-sage-600 dark:text-sage-400"
      />
    </div>

    <h3 class="text-xl font-display text-neutral-700 dark:text-neutral-100 mb-2">
      Recipe imported!
    </h3>

    <p class="text-neutral-500 dark:text-neutral-400 mb-6">
      From {{ recipe.sourceSite || 'external source' }}
    </p>

    <!-- Quick preview -->
    <UCard class="max-w-md mx-auto text-left mb-6 hover-lift">
      <div class="flex gap-4">
        <img
          v-if="recipe.coverPhoto"
          :src="recipe.coverPhoto"
          :alt="recipe.title"
          class="w-24 h-24 rounded-xl object-cover flex-shrink-0"
        >
        <div
          v-else
          class="w-24 h-24 rounded-xl bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center flex-shrink-0"
        >
          <UIcon
            name="i-heroicons-photo"
            class="w-8 h-8 text-neutral-400"
          />
        </div>
        <div class="flex-1 min-w-0">
          <h4 class="font-semibold text-neutral-700 dark:text-neutral-100 line-clamp-2">
            {{ recipe.title }}
          </h4>
          <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {{ recipe.ingredients?.length || 0 }} ingredients •
            {{ recipe.instructions?.length || 0 }} steps
          </p>
          <div
            v-if="totalTime || recipe.servings"
            class="flex gap-3 mt-2 text-xs text-neutral-400"
          >
            <span
              v-if="totalTime"
              class="flex items-center gap-1"
            >
              <UIcon
                name="i-heroicons-clock"
                class="w-3.5 h-3.5"
              />
              {{ totalTime }}
            </span>
            <span
              v-if="recipe.servings"
              class="flex items-center gap-1"
            >
              <UIcon
                name="i-heroicons-users"
                class="w-3.5 h-3.5"
              />
              {{ recipe.servings }} servings
            </span>
          </div>
        </div>
      </div>
    </UCard>

    <p class="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
      Review and edit the recipe before saving
    </p>

    <UButton
      color="primary"
      size="lg"
      class="press-effect"
      icon="i-heroicons-pencil-square"
      @click="emit('continue')"
    >
      Continue to Editor
    </UButton>
  </div>
</template>

<style scoped>
.animate-scale-in {
  animation: scale-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes scale-in {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
