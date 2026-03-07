<script setup lang="ts">
interface Recipe {
  id: number
  title: string
  coverPhoto: string | null
}

interface Props {
  selectedRecipes: Recipe[]
  loading: boolean
  disabled: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  clear: []
  create: []
}>()

const selectedCount = computed(() => props.selectedRecipes.length)

// Show first 3 recipes as preview
const previewRecipes = computed(() => props.selectedRecipes.slice(0, 3))
const extraCount = computed(() => Math.max(0, selectedCount.value - 3))

// Estimate ingredients (rough average of 8-12 per recipe)
const estimatedIngredients = computed(() => {
  const avg = 10
  return selectedCount.value * avg
})
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    leave-active-class="transition-all duration-300 ease-in"
    enter-from-class="translate-y-full opacity-0"
    leave-to-class="translate-y-full opacity-0"
  >
    <div
      v-if="selectedCount > 0"
      class="fixed bottom-0 left-0 right-0 z-40 glass border-t border-neutral-200 dark:border-neutral-700"
    >
      <div class="max-w-4xl mx-auto px-4 py-4 sm:px-6">
        <div class="flex items-center justify-between gap-4">
          <!-- Selection Info -->
          <div class="flex items-center gap-3">
            <!-- Recipe Thumbnails -->
            <div class="flex -space-x-2">
              <template
                v-for="recipe in previewRecipes"
                :key="recipe.id"
              >
                <img
                  v-if="recipe.coverPhoto"
                  :src="recipe.coverPhoto"
                  :alt="recipe.title"
                  class="w-10 h-10 rounded-full border-2 border-white dark:border-neutral-800 object-cover"
                >
                <div
                  v-else
                  class="w-10 h-10 rounded-full border-2 border-white dark:border-neutral-800 bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center"
                >
                  <UIcon
                    name="i-heroicons-photo"
                    class="w-5 h-5 text-neutral-400"
                  />
                </div>
              </template>
              <div
                v-if="extraCount > 0"
                class="w-10 h-10 rounded-full border-2 border-white dark:border-neutral-800 bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-sm font-medium text-primary-700 dark:text-primary-300"
              >
                +{{ extraCount }}
              </div>
            </div>

            <!-- Text Info -->
            <div class="hidden sm:block">
              <p class="font-medium text-neutral-700 dark:text-neutral-100">
                {{ selectedCount }} recipe{{ selectedCount === 1 ? '' : 's' }} selected
              </p>
              <p class="text-sm text-neutral-500 dark:text-neutral-400">
                ~{{ estimatedIngredients }} ingredients
              </p>
            </div>
            <p class="sm:hidden text-sm font-medium text-neutral-700 dark:text-neutral-100">
              {{ selectedCount }} selected
            </p>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2">
            <UButton
              variant="ghost"
              color="neutral"
              size="sm"
              class="hidden sm:flex"
              @click="emit('clear')"
            >
              Clear
            </UButton>
            <UButton
              color="primary"
              :loading="loading"
              :disabled="disabled"
              class="press-effect"
              @click="emit('create')"
            >
              <UIcon
                name="i-heroicons-shopping-cart"
                class="w-4 h-4 sm:mr-1"
              />
              <span class="hidden sm:inline">Create List</span>
            </UButton>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>
