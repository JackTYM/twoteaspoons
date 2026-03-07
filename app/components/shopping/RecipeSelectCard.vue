<script setup lang="ts">
interface Recipe {
  id: number
  title: string
  coverPhoto: string | null
  servings?: number | null
  prepTime?: number | null
  cookTime?: number | null
}

interface Props {
  recipe: Recipe
  selected: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  toggle: []
}>()

function formatTime(recipe: Recipe): string | null {
  const total = (recipe.prepTime || 0) + (recipe.cookTime || 0)
  if (!total) return null
  if (total < 60) return `${total}m`
  const hours = Math.floor(total / 60)
  const mins = total % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}
</script>

<template>
  <button
    type="button"
    class="relative rounded-xl overflow-hidden transition-all duration-200 text-left w-full group"
    :class="[
      selected
        ? 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-neutral-950 scale-[0.98]'
        : 'hover:ring-2 hover:ring-neutral-300 dark:hover:ring-neutral-600 hover:shadow-lg'
    ]"
    @click="emit('toggle')"
  >
    <!-- Cover Photo -->
    <div class="aspect-[4/3] relative bg-neutral-200 dark:bg-neutral-700">
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
          class="w-12 h-12 text-neutral-400"
        />
      </div>

      <!-- Selected Overlay -->
      <Transition
        enter-active-class="transition-opacity duration-200"
        leave-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div
          v-if="selected"
          class="absolute inset-0 bg-primary-500/30 flex items-center justify-center"
        >
          <div class="w-14 h-14 rounded-full bg-primary-500 flex items-center justify-center shadow-lg animate-scale-in">
            <UIcon
              name="i-heroicons-check"
              class="w-8 h-8 text-white"
            />
          </div>
        </div>
      </Transition>

      <!-- Checkbox (top-right) -->
      <div class="absolute top-3 right-3">
        <div
          class="w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-200 shadow-md"
          :class="[
            selected
              ? 'bg-primary-500 border-primary-500'
              : 'bg-white/90 border-neutral-300 group-hover:border-primary-400'
          ]"
        >
          <UIcon
            v-if="selected"
            name="i-heroicons-check"
            class="w-4 h-4 text-white"
          />
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="p-3 bg-white dark:bg-neutral-800">
      <h4 class="font-medium text-neutral-700 dark:text-neutral-100 truncate">
        {{ recipe.title }}
      </h4>
      <div class="flex items-center gap-3 mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        <span
          v-if="recipe.servings"
          class="flex items-center gap-1"
        >
          <UIcon
            name="i-heroicons-users"
            class="w-3.5 h-3.5"
          />
          {{ recipe.servings }}
        </span>
        <span
          v-if="formatTime(recipe)"
          class="flex items-center gap-1"
        >
          <UIcon
            name="i-heroicons-clock"
            class="w-3.5 h-3.5"
          />
          {{ formatTime(recipe) }}
        </span>
      </div>
    </div>
  </button>
</template>

<style scoped>
@keyframes scale-in {
  from {
    transform: scale(0);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.animate-scale-in {
  animation: scale-in 0.2s ease-out;
}
</style>
