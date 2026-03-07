<script setup lang="ts">
interface Action {
  title: string
  description: string
  icon: string
  to: string
  color: string
}

const actions: Action[] = [
  {
    title: 'Import Recipe',
    description: 'Paste a URL and skip the life story',
    icon: 'i-heroicons-arrow-down-tray',
    to: '/recipes/import',
    color: 'primary',
  },
  {
    title: 'New Recipe',
    description: 'Create your own from scratch',
    icon: 'i-heroicons-plus-circle',
    to: '/recipes/new',
    color: 'sage',
  },
  {
    title: 'Plan Meals',
    description: 'Organize your week ahead',
    icon: 'i-heroicons-calendar',
    to: '/meal-plan',
    color: 'butter',
  },
]

type ColorClasses = { bg: string; icon: string; hover: string }

const defaultColorClasses: ColorClasses = {
  bg: 'bg-primary-100 dark:bg-primary-900/30',
  icon: 'text-primary-600 dark:text-primary-400',
  hover: 'group-hover:bg-primary-200 dark:group-hover:bg-primary-800/40',
}

const colorClasses: Record<string, ColorClasses> = {
  primary: defaultColorClasses,
  sage: {
    bg: 'bg-sage-100 dark:bg-sage-900/30',
    icon: 'text-sage-600 dark:text-sage-400',
    hover: 'group-hover:bg-sage-200 dark:group-hover:bg-sage-800/40',
  },
  butter: {
    bg: 'bg-butter-100 dark:bg-butter-900/30',
    icon: 'text-butter-600 dark:text-butter-400',
    hover: 'group-hover:bg-butter-200 dark:group-hover:bg-butter-800/40',
  },
  terracotta: {
    bg: 'bg-terracotta-100 dark:bg-terracotta-900/30',
    icon: 'text-terracotta-600 dark:text-terracotta-400',
    hover: 'group-hover:bg-terracotta-200 dark:group-hover:bg-terracotta-800/40',
  },
}

function getColorClasses(color: string): ColorClasses {
  return colorClasses[color] ?? defaultColorClasses
}
</script>

<template>
  <div class="mb-8">
    <h2 class="text-lg font-display text-neutral-700 dark:text-neutral-100 mb-4">
      Quick Actions
    </h2>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <NuxtLink
        v-for="action in actions"
        :key="action.to"
        :to="action.to"
        class="group block"
      >
        <div class="p-4 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover-lift transition-all h-full">
          <div
            class="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors"
            :class="[getColorClasses(action.color).bg, getColorClasses(action.color).hover]"
          >
            <UIcon
              :name="action.icon"
              class="w-5 h-5 transition-transform group-hover:scale-110"
              :class="getColorClasses(action.color).icon"
            />
          </div>
          <h3 class="font-medium text-neutral-700 dark:text-neutral-100 text-sm mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            {{ action.title }}
          </h3>
          <p class="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">
            {{ action.description }}
          </p>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
