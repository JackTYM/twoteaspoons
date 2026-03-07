<script setup lang="ts">
interface Recipe {
  id: number
  title: string
  coverPhoto: string | null
  prepTime: number | null
  cookTime: number | null
}

interface Props {
  recipe: Recipe
}

defineProps<Props>()

const emit = defineEmits<{
  remove: []
}>()

const isHovered = ref(false)

function formatTime(prepTime: number | null, cookTime: number | null): string {
  const total = (prepTime || 0) + (cookTime || 0)
  if (total === 0) return ''
  if (total < 60) return `${total}m`
  const hours = Math.floor(total / 60)
  const mins = total % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}
</script>

<template>
  <div
    class="relative group rounded-xl overflow-hidden bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-primary-300 dark:hover:border-primary-600 transition-all hover-lift"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <!-- Drag Handle -->
    <div class="absolute top-2 left-2 z-10 drag-handle cursor-grab active:cursor-grabbing">
      <div class="w-8 h-8 rounded-lg bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
        <UIcon
          name="i-heroicons-bars-3"
          class="w-4 h-4 text-neutral-500"
        />
      </div>
    </div>

    <!-- Remove Button -->
    <Transition
      enter-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-show="isHovered" class="absolute top-2 right-2 z-10">
        <UButton
          type="button"
          color="error"
          variant="solid"
          icon="i-heroicons-x-mark"
          size="xs"
          @click="emit('remove')"
        />
      </div>
    </Transition>

    <!-- Recipe Image -->
    <div class="aspect-[4/3] relative">
      <img
        v-if="recipe.coverPhoto"
        :src="recipe.coverPhoto"
        :alt="recipe.title"
        class="w-full h-full object-cover"
      >
      <div
        v-else
        class="w-full h-full bg-gradient-to-br from-primary-100 to-terracotta-100 dark:from-primary-900/50 dark:to-terracotta-900/50 flex items-center justify-center"
      >
        <UIcon
          name="i-heroicons-photo"
          class="w-12 h-12 text-neutral-400 dark:text-neutral-600"
        />
      </div>
    </div>

    <!-- Recipe Info -->
    <div class="p-3">
      <h4 class="font-medium text-sm text-neutral-700 dark:text-neutral-200 line-clamp-2">
        {{ recipe.title }}
      </h4>
      <p
        v-if="formatTime(recipe.prepTime, recipe.cookTime)"
        class="text-xs text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-1"
      >
        <UIcon
          name="i-heroicons-clock"
          class="w-3 h-3"
        />
        {{ formatTime(recipe.prepTime, recipe.cookTime) }}
      </p>
    </div>
  </div>
</template>
