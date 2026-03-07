<script setup lang="ts">
interface BreadcrumbItem {
  label: string
  to?: string
  icon?: string
}

interface Props {
  items: BreadcrumbItem[]
}

defineProps<Props>()
</script>

<template>
  <nav
    aria-label="Breadcrumb"
    class="flex items-center text-sm"
  >
    <ol class="flex items-center flex-wrap gap-1">
      <!-- Home link -->
      <li class="flex items-center">
        <NuxtLink
          to="/"
          class="text-neutral-500 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors link-animated"
          aria-label="Home"
        >
          <UIcon
            name="i-heroicons-home"
            class="w-4 h-4"
          />
        </NuxtLink>
      </li>

      <!-- Breadcrumb items -->
      <template
        v-for="(item, index) in items"
        :key="index"
      >
        <!-- Separator -->
        <li
          class="flex items-center text-neutral-400 dark:text-neutral-600"
          aria-hidden="true"
        >
          <UIcon
            name="i-heroicons-chevron-right"
            class="w-4 h-4"
          />
        </li>

        <!-- Breadcrumb item -->
        <li class="flex items-center">
          <!-- Link if not last item -->
          <NuxtLink
            v-if="item.to && index < items.length - 1"
            :to="item.to"
            class="text-neutral-500 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors link-animated flex items-center gap-1"
          >
            <UIcon
              v-if="item.icon"
              :name="item.icon"
              class="w-4 h-4"
            />
            <span class="hidden sm:inline">{{ item.label }}</span>
            <span class="sm:hidden">{{ item.label.length > 12 ? item.label.slice(0, 12) + '...' : item.label }}</span>
          </NuxtLink>

          <!-- Current page (last item) -->
          <span
            v-else
            class="text-neutral-700 dark:text-neutral-200 font-medium flex items-center gap-1"
            aria-current="page"
          >
            <UIcon
              v-if="item.icon"
              :name="item.icon"
              class="w-4 h-4"
            />
            <span class="hidden sm:inline">{{ item.label }}</span>
            <span class="sm:hidden">{{ item.label.length > 16 ? item.label.slice(0, 16) + '...' : item.label }}</span>
          </span>
        </li>
      </template>
    </ol>
  </nav>
</template>
