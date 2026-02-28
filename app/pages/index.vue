<script setup lang="ts">
const { isAuthenticated, isLoading } = useAuth()

useSeoMeta({
  title: 'Home',
  description: 'Discover, save, and share recipes with TwoTeaspoons - the recipe platform for home cooks.',
})
</script>

<template>
  <div>
    <!-- Hero Section -->
    <header class="px-6 py-12 md:py-24 text-center">
      <div class="max-w-3xl mx-auto">
        <img
          src="/images/logo.svg"
          alt="TwoTeaspoons"
          class="w-24 h-24 mx-auto mb-6 dark:brightness-150"
        >
        <h1 class="text-4xl md:text-5xl font-bold text-neutral-700 dark:text-neutral-50 mb-4">
          TwoTeaspoons
        </h1>
        <p class="text-xl text-neutral-500 dark:text-neutral-400 mb-8">
          Recipes worth sharing
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <template v-if="!isLoading">
            <template v-if="isAuthenticated">
              <UButton
                to="/recipes"
                size="lg"
                color="primary"
              >
                My Recipes
              </UButton>
              <UButton
                to="/recipes/new"
                size="lg"
                variant="outline"
                color="neutral"
              >
                Add Recipe
              </UButton>
            </template>
            <template v-else>
              <UButton
                to="/auth/signup"
                size="lg"
                color="primary"
              >
                Get Started
              </UButton>
              <UButton
                to="/auth/signin"
                size="lg"
                variant="outline"
                color="neutral"
              >
                Sign In
              </UButton>
            </template>
          </template>
        </div>
      </div>
    </header>

    <!-- Features Preview -->
    <section class="px-6 py-16 bg-neutral-100 dark:bg-neutral-900">
      <div class="max-w-5xl mx-auto">
        <h2 class="text-2xl md:text-3xl font-bold text-neutral-700 dark:text-neutral-50 text-center mb-12">
          Everything you need for your recipe collection
        </h2>
        <div class="grid md:grid-cols-3 gap-6">
          <UCard
            class="bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 shadow-sm hover:shadow-md transition-shadow"
            :ui="{ header: 'pb-2', body: 'pt-0' }"
          >
            <template #header>
              <div class="flex items-center gap-3">
                <div class="p-2 rounded-lg bg-primary-100 dark:bg-primary-900">
                  <UIcon
                    name="i-heroicons-book-open"
                    class="w-5 h-5 text-primary-600 dark:text-primary-400"
                  />
                </div>
                <h3 class="font-semibold text-neutral-700 dark:text-neutral-100">
                  Save & Organize
                </h3>
              </div>
            </template>
            <p class="text-neutral-500 dark:text-neutral-400">
              Import recipes from any URL, organize with tags and collections, and access your favorites anytime.
            </p>
          </UCard>

          <UCard
            class="bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 shadow-sm hover:shadow-md transition-shadow"
            :ui="{ header: 'pb-2', body: 'pt-0' }"
          >
            <template #header>
              <div class="flex items-center gap-3">
                <div class="p-2 rounded-lg bg-success-100 dark:bg-success-900">
                  <UIcon
                    name="i-heroicons-scale"
                    class="w-5 h-5 text-success-600 dark:text-success-400"
                  />
                </div>
                <h3 class="font-semibold text-neutral-700 dark:text-neutral-100">
                  Smart Scaling
                </h3>
              </div>
            </template>
            <p class="text-neutral-500 dark:text-neutral-400">
              Adjust servings with one click. Smart rounding keeps your measurements practical.
            </p>
          </UCard>

          <UCard
            class="bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 shadow-sm hover:shadow-md transition-shadow"
            :ui="{ header: 'pb-2', body: 'pt-0' }"
          >
            <template #header>
              <div class="flex items-center gap-3">
                <div class="p-2 rounded-lg bg-warning-100 dark:bg-warning-900">
                  <UIcon
                    name="i-heroicons-calendar-days"
                    class="w-5 h-5 text-warning-600 dark:text-warning-400"
                  />
                </div>
                <h3 class="font-semibold text-neutral-700 dark:text-neutral-100">
                  Meal Planning
                </h3>
              </div>
            </template>
            <p class="text-neutral-500 dark:text-neutral-400">
              Plan your week, generate shopping lists, and never wonder "what's for dinner" again.
            </p>
          </UCard>
        </div>
      </div>
    </section>
  </div>
</template>
