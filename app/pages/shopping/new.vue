<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

useSeoMeta({
  title: 'New Shopping List',
  description: 'Create a shopping list from your recipes',
})

interface Recipe {
  id: number
  title: string
  coverPhoto: string | null
}

const { data: recipesData } = await useFetch<{ recipes: Recipe[] }>('/api/recipes')
const recipes = computed(() => recipesData.value?.recipes || [])

const selectedRecipes = ref<number[]>([])
const listName = ref('')
const creating = ref(false)
const error = ref('')

function toggleRecipe(id: number): void {
  const index = selectedRecipes.value.indexOf(id)
  if (index === -1) {
    selectedRecipes.value.push(id)
  } else {
    selectedRecipes.value.splice(index, 1)
  }
}

function isSelected(id: number): boolean {
  return selectedRecipes.value.includes(id)
}

async function createList(): Promise<void> {
  if (!listName.value.trim()) {
    error.value = 'Please enter a list name'
    return
  }

  if (selectedRecipes.value.length === 0) {
    error.value = 'Please select at least one recipe'
    return
  }

  creating.value = true
  error.value = ''

  try {
    const result = await $fetch<{ list: { id: number } }>('/api/shopping-lists', {
      method: 'POST',
      body: {
        name: listName.value.trim(),
        recipeIds: selectedRecipes.value,
      },
    })

    navigateTo(`/shopping/${result.list.id}`)
  } catch (err) {
    console.error('Failed to create list:', err)
    error.value = 'Failed to create shopping list'
    creating.value = false
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
    <!-- Header -->
    <div class="mb-8">
      <NuxtLink
        to="/shopping"
        class="text-sm text-neutral-500 dark:text-neutral-400 hover:text-primary-500 mb-2 inline-flex items-center gap-1"
      >
        <UIcon name="i-heroicons-arrow-left" />
        Back to Lists
      </NuxtLink>
      <h1 class="text-3xl font-bold text-neutral-700 dark:text-neutral-50">
        New Shopping List
      </h1>
      <p class="text-neutral-500 dark:text-neutral-400 mt-1">
        Select recipes to generate a shopping list
      </p>
    </div>

    <!-- List Name -->
    <div class="mb-8">
      <UFormField label="List Name">
        <UInput
          v-model="listName"
          placeholder="e.g., Weekend Dinner Party"
          size="lg"
          class="w-full max-w-md"
        />
      </UFormField>
    </div>

    <!-- Error Message -->
    <UAlert
      v-if="error"
      color="error"
      icon="i-heroicons-exclamation-circle"
      :title="error"
      class="mb-6"
    />

    <!-- Recipe Selection -->
    <div class="mb-8">
      <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100 mb-4">
        Select Recipes ({{ selectedRecipes.length }} selected)
      </h2>

      <div
        v-if="recipes.length === 0"
        class="text-center py-12 bg-neutral-100 dark:bg-neutral-800 rounded-lg"
      >
        <UIcon
          name="i-heroicons-book-open"
          class="w-12 h-12 text-neutral-400 mx-auto mb-4"
        />
        <p class="text-neutral-500 dark:text-neutral-400">
          No recipes yet. Create some recipes first.
        </p>
        <UButton
          to="/recipes/new"
          color="primary"
          class="mt-4"
        >
          Create Recipe
        </UButton>
      </div>

      <div
        v-else
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <div
          v-for="recipe in recipes"
          :key="recipe.id"
          class="relative cursor-pointer group"
          @click="toggleRecipe(recipe.id)"
        >
          <UCard
            :class="[
              'transition-all',
              isSelected(recipe.id)
                ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'bg-neutral-50 dark:bg-neutral-800 hover:shadow-md'
            ]"
          >
            <div class="flex items-center gap-3">
              <div
                v-if="recipe.coverPhoto"
                class="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0"
              >
                <img
                  :src="recipe.coverPhoto"
                  :alt="recipe.title"
                  class="w-full h-full object-cover"
                >
              </div>
              <div
                v-else
                class="w-16 h-16 rounded-lg bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center flex-shrink-0"
              >
                <UIcon
                  name="i-heroicons-photo"
                  class="w-8 h-8 text-neutral-400"
                />
              </div>

              <div class="flex-1 min-w-0">
                <h3 class="font-medium text-neutral-700 dark:text-neutral-100 truncate">
                  {{ recipe.title }}
                </h3>
              </div>

              <UIcon
                v-if="isSelected(recipe.id)"
                name="i-heroicons-check-circle-solid"
                class="w-6 h-6 text-primary-500 flex-shrink-0"
              />
              <div
                v-else
                class="w-6 h-6 rounded-full border-2 border-neutral-300 dark:border-neutral-600 flex-shrink-0"
              />
            </div>
          </UCard>
        </div>
      </div>
    </div>

    <!-- Create Button -->
    <div class="flex justify-end gap-4">
      <UButton
        to="/shopping"
        color="neutral"
        variant="outline"
      >
        Cancel
      </UButton>
      <UButton
        color="primary"
        :loading="creating"
        :disabled="selectedRecipes.length === 0 || !listName.trim()"
        @click="createList"
      >
        Create Shopping List
      </UButton>
    </div>
  </div>
</template>
