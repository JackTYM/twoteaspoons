<script setup lang="ts">
import draggable from 'vuedraggable'
import RecipeGridItem from './RecipeGridItem.vue'

interface Recipe {
  id: number
  title: string
  coverPhoto: string | null
  prepTime: number | null
  cookTime: number | null
}

interface Props {
  recipes: Recipe[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:recipes': [recipes: Recipe[]]
  add: []
  remove: [recipeId: number]
  reorder: [recipes: Recipe[]]
}>()

// Local copy for draggable
const localRecipes = computed({
  get: () => props.recipes,
  set: (value) => {
    emit('update:recipes', value)
    emit('reorder', value)
  },
})

function handleRemove(recipeId: number): void {
  emit('remove', recipeId)
}
</script>

<template>
  <div class="editable-recipe-grid">
    <!-- Section Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <span class="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
          <UIcon
            name="i-heroicons-book-open"
            class="w-5 h-5 text-primary-600 dark:text-primary-400"
          />
        </span>
        <div>
          <h2 class="text-xl font-display text-neutral-700 dark:text-neutral-100">
            Recipes
          </h2>
          <p class="text-sm text-neutral-500 dark:text-neutral-400">
            {{ recipes.length }} {{ recipes.length === 1 ? 'recipe' : 'recipes' }}
          </p>
        </div>
      </div>
      <UButton
        type="button"
        color="primary"
        variant="soft"
        icon="i-heroicons-plus"
        @click="emit('add')"
      >
        Add Recipes
      </UButton>
    </div>

    <!-- Empty State -->
    <div
      v-if="recipes.length === 0"
      class="text-center py-16 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border-2 border-dashed border-neutral-200 dark:border-neutral-700"
    >
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center">
        <UIcon
          name="i-heroicons-book-open"
          class="w-8 h-8 text-neutral-400 dark:text-neutral-500"
        />
      </div>
      <h3 class="text-lg font-medium text-neutral-700 dark:text-neutral-200 mb-2">
        No recipes yet
      </h3>
      <p class="text-neutral-500 dark:text-neutral-400 mb-6 max-w-sm mx-auto">
        Add recipes to your collection. You can drag and drop to reorder them.
      </p>
      <UButton
        color="primary"
        icon="i-heroicons-plus"
        @click="emit('add')"
      >
        Add Your First Recipe
      </UButton>
    </div>

    <!-- Recipe Grid with Drag & Drop -->
    <draggable
      v-else
      v-model="localRecipes"
      item-key="id"
      handle=".drag-handle"
      :animation="200"
      ghost-class="opacity-30"
      drag-class="shadow-xl rotate-2"
      class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
    >
      <template #item="{ element }">
        <RecipeGridItem
          :recipe="element"
          @remove="handleRemove(element.id)"
        />
      </template>
    </draggable>

    <!-- Add More Button (when there are recipes) -->
    <div
      v-if="recipes.length > 0"
      class="mt-6"
    >
      <UButton
        type="button"
        color="neutral"
        variant="outline"
        icon="i-heroicons-plus"
        class="w-full"
        @click="emit('add')"
      >
        Add More Recipes
      </UButton>
    </div>
  </div>
</template>
