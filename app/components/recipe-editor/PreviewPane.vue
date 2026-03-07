<script setup lang="ts">
import type { RecipeWithRelations } from '~/types/recipe'

interface Props {
  recipe: RecipeWithRelations
}

defineProps<Props>()
</script>

<template>
  <div class="preview-pane">
    <!-- Preview Header Badge -->
    <div class="mb-6 flex items-center justify-center">
      <div class="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 dark:bg-primary-900/30 rounded-full">
        <UIcon
          name="i-heroicons-eye"
          class="w-4 h-4 text-primary-600 dark:text-primary-400"
        />
        <span class="text-sm font-medium text-primary-700 dark:text-primary-300">
          Preview Mode
        </span>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="!recipe.title && !recipe.coverPhoto && recipe.ingredients.length === 0"
      class="text-center py-16"
    >
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
        <UIcon
          name="i-heroicons-document-text"
          class="w-8 h-8 text-neutral-400"
        />
      </div>
      <h3 class="text-lg font-medium text-neutral-600 dark:text-neutral-300 mb-2">
        Nothing to preview yet
      </h3>
      <p class="text-neutral-500 dark:text-neutral-400">
        Start adding content in the Edit tab to see your recipe here.
      </p>
    </div>

    <!-- Recipe Preview -->
    <template v-else>
      <!-- Hero Section -->
      <div class="relative overflow-hidden rounded-2xl aspect-[21/9] md:aspect-[3/1] mb-8">
        <!-- Cover Image or Placeholder -->
        <div
          v-if="recipe.coverPhoto"
          class="absolute inset-0"
        >
          <img
            :src="recipe.coverPhoto"
            :alt="recipe.title"
            class="w-full h-full object-cover"
          >
        </div>
        <div
          v-else
          class="absolute inset-0 bg-gradient-to-br from-primary-200 to-terracotta-200 dark:from-primary-900 dark:to-terracotta-900"
        >
          <div class="absolute inset-0 flex items-center justify-center">
            <UIcon
              name="i-heroicons-photo"
              class="w-16 h-16 text-neutral-400 dark:text-neutral-600"
            />
          </div>
        </div>

        <!-- Gradient Overlay -->
        <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        <!-- Content Overlay -->
        <div class="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <div class="max-w-4xl mx-auto">
            <!-- Title -->
            <h1 class="text-3xl md:text-4xl lg:text-5xl font-display text-white mb-3 drop-shadow-lg">
              {{ recipe.title || 'Untitled Recipe' }}
            </h1>

            <!-- Description -->
            <p
              v-if="recipe.description"
              class="text-white/90 text-lg max-w-2xl line-clamp-2 mb-3 drop-shadow"
            >
              {{ recipe.description }}
            </p>

            <!-- Metadata Pills -->
            <div class="flex flex-wrap gap-2 md:gap-3">
              <div
                v-if="recipe.prepTime"
                class="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm"
              >
                <UIcon
                  name="i-heroicons-clock"
                  class="w-4 h-4"
                />
                <span>Prep: {{ recipe.prepTime }} min</span>
              </div>

              <div
                v-if="recipe.cookTime"
                class="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm"
              >
                <UIcon
                  name="i-heroicons-fire"
                  class="w-4 h-4"
                />
                <span>Cook: {{ recipe.cookTime }} min</span>
              </div>

              <div
                v-if="recipe.servings"
                class="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm"
              >
                <UIcon
                  name="i-heroicons-users"
                  class="w-4 h-4"
                />
                <span>{{ recipe.servings }} servings</span>
              </div>

              <div
                v-if="!recipe.isPublished"
                class="flex items-center gap-1.5 px-3 py-1.5 bg-warning-500/80 backdrop-blur-sm rounded-full text-white text-sm font-medium"
              >
                <UIcon
                  name="i-heroicons-eye-slash"
                  class="w-4 h-4"
                />
                <span>Private</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons Preview -->
      <div class="mb-8 flex flex-wrap items-center gap-2 opacity-50 pointer-events-none">
        <UButton
          color="primary"
          size="lg"
          icon="i-heroicons-play"
        >
          Cook Mode
        </UButton>
        <UButton
          color="neutral"
          variant="outline"
          icon="i-heroicons-printer"
        >
          Print
        </UButton>
        <UButton
          color="neutral"
          variant="outline"
          icon="i-heroicons-folder-plus"
        >
          Save
        </UButton>
      </div>

      <!-- Main Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Ingredients Sidebar -->
        <div class="lg:col-span-1 lg:order-1">
          <RecipeDetailIngredientCard
            :ingredients="recipe.ingredients"
            :servings="recipe.servings"
          />
        </div>

        <!-- Instructions -->
        <div class="lg:col-span-2 lg:order-2">
          <RecipeDetailInstructionTimeline
            :instructions="recipe.instructions"
          />
        </div>
      </div>

      <!-- Source Attribution -->
      <div
        v-if="recipe.sourceUrl || recipe.sourceAuthor || recipe.sourceSite"
        class="mt-8"
      >
        <RecipeDetailSourceAttribution
          :source-url="recipe.sourceUrl"
          :source-author="recipe.sourceAuthor"
          :source-site="recipe.sourceSite"
        />
      </div>
    </template>
  </div>
</template>
