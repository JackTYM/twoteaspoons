<script setup lang="ts">
interface Site {
  name: string
  icon?: string
}

const sites: Site[] = [
  { name: 'AllRecipes', icon: 'i-heroicons-home' },
  { name: 'Food Network', icon: 'i-heroicons-tv' },
  { name: 'NYT Cooking', icon: 'i-heroicons-newspaper' },
  { name: 'Serious Eats', icon: 'i-heroicons-fire' },
  { name: 'Epicurious', icon: 'i-heroicons-sparkles' },
  { name: 'Bon Appétit', icon: 'i-heroicons-heart' },
  { name: 'Food52', icon: 'i-heroicons-cake' },
  { name: 'Tasty', icon: 'i-heroicons-face-smile' },
  { name: 'Simply Recipes', icon: 'i-heroicons-book-open' },
  { name: 'Delish', icon: 'i-heroicons-star' },
  { name: 'The Kitchn', icon: 'i-heroicons-home-modern' },
  { name: 'Budget Bytes', icon: 'i-heroicons-currency-dollar' },
]

const showAll = ref(false)

const visibleSites = computed((): Site[] => {
  return showAll.value ? sites : sites.slice(0, 6)
})
</script>

<template>
  <div class="mt-8 text-center">
    <p class="text-sm text-neutral-500 dark:text-neutral-400 mb-4 flex items-center justify-center gap-2">
      <UIcon
        name="i-heroicons-check-badge"
        class="w-4 h-4 text-sage-500"
      />
      Works with most recipe sites including:
    </p>

    <TransitionGroup
      name="site-list"
      tag="div"
      class="flex flex-wrap justify-center gap-2"
    >
      <div
        v-for="site in visibleSites"
        :key="site.name"
        class="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full text-sm text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
      >
        <UIcon
          v-if="site.icon"
          :name="site.icon"
          class="w-3.5 h-3.5 text-neutral-400"
        />
        {{ site.name }}
      </div>
    </TransitionGroup>

    <button
      v-if="sites.length > 6"
      class="text-sm text-primary-500 hover:text-primary-600 mt-4 flex items-center gap-1 mx-auto transition-colors"
      @click="showAll = !showAll"
    >
      <UIcon
        :name="showAll ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
        class="w-4 h-4"
      />
      {{ showAll ? 'Show less' : `+${sites.length - 6} more sites` }}
    </button>

    <p class="text-xs text-neutral-400 dark:text-neutral-500 mt-4">
      Any site with structured recipe data (schema.org) is supported
    </p>
  </div>
</template>

<style scoped>
.site-list-enter-active,
.site-list-leave-active {
  transition: all 0.3s ease;
}

.site-list-enter-from,
.site-list-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

.site-list-move {
  transition: transform 0.3s ease;
}
</style>
