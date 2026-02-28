<script setup lang="ts">
import type { Recipe, RecipeWithRelations } from '~/types/recipe'

definePageMeta({
  middleware: 'auth',
})

useSeoMeta({
  title: 'My Recipes',
  description: 'Your personal recipe collection',
})

const { data, status, error } = await useFetch<{ recipes: RecipeWithRelations[] }>('/api/recipes')

const recipes = computed(() => data.value?.recipes || [])

function formatTime(minutes: number | null): string {
  if (!minutes) return ''
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

function totalTime(recipe: Recipe): string {
  const total = (recipe.prepTime || 0) + (recipe.cookTime || 0)
  return formatTime(total)
}
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 sm:px-6 py-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-3xl font-bold text-neutral-700 dark:text-neutral-50">
          My Recipes
        </h1>
        <p class="text-neutral-500 dark:text-neutral-400 mt-1">
          {{ recipes.length }} recipe{{ recipes.length === 1 ? '' : 's' }}
        </p>
      </div>
      <UButton
        to="/recipes/new"
        color="primary"
        icon="i-heroicons-plus"
      >
        New Recipe
      </UButton>
    </div>

    <!-- Loading State -->
    <div
      v-if="status === 'pending'"
      class="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      <USkeleton
        v-for="i in 6"
        :key="i"
        class="h-64 rounded-xl"
      />
    </div>

    <!-- Error State -->
    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      title="Failed to load recipes"
      :description="error.message"
      icon="i-heroicons-exclamation-circle"
    />

    <!-- Empty State -->
    <div
      v-else-if="recipes.length === 0"
      class="text-center py-16"
    >
      <div class="p-4 rounded-full bg-neutral-100 dark:bg-neutral-800 inline-block mb-4">
        <UIcon
          name="i-heroicons-book-open"
          class="w-12 h-12 text-neutral-400"
        />
      </div>
      <h2 class="text-xl font-semibold text-neutral-700 dark:text-neutral-100 mb-2">
        No recipes yet
      </h2>
      <p class="text-neutral-500 dark:text-neutral-400 mb-6">
        Start building your collection by adding your first recipe.
      </p>
      <UButton
        to="/recipes/new"
        color="primary"
        icon="i-heroicons-plus"
      >
        Add Your First Recipe
      </UButton>
    </div>

    <!-- Recipe Grid -->
    <div
      v-else
      class="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      <NuxtLink
        v-for="recipe in recipes"
        :key="recipe.id"
        :to="`/recipes/${recipe.id}`"
        class="group"
      >
        <UCard
          class="h-full bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:shadow-lg transition-all hover:-translate-y-1"
          :ui="{ body: 'p-0' }"
        >
          <!-- Cover Image -->
          <div class="aspect-video bg-neutral-200 dark:bg-neutral-700 rounded-t-lg overflow-hidden">
            <img
              v-if="recipe.coverPhoto"
              :src="recipe.coverPhoto"
              :alt="recipe.title"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
          </div>

          <!-- Content -->
          <div class="p-4">
            <h3 class="font-semibold text-neutral-700 dark:text-neutral-100 mb-1 line-clamp-1">
              {{ recipe.title }}
            </h3>
            <p
              v-if="recipe.description"
              class="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2 mb-3"
            >
              {{ recipe.description }}
            </p>

            <!-- Meta -->
            <div class="flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
              <span
                v-if="totalTime(recipe)"
                class="flex items-center gap-1"
              >
                <UIcon
                  name="i-heroicons-clock"
                  class="w-4 h-4"
                />
                {{ totalTime(recipe) }}
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
            </div>
          </div>
        </UCard>
      </NuxtLink>
    </div>
  </div>
</template>
