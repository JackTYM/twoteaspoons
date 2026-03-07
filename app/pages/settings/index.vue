<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

useSeoMeta({
  title: 'Settings',
})

const { user } = useAuth()

const settingsItems = [
  {
    title: 'Edit Profile',
    description: 'Update your name, username, and profile photo',
    icon: 'i-heroicons-user-circle',
    to: '/settings/profile',
  },
  {
    title: 'Import Recipes',
    description: 'Bulk import recipes from a JSON file',
    icon: 'i-heroicons-arrow-up-tray',
    to: '/settings/import',
  },
  {
    title: 'Export Data',
    description: 'Download a copy of your recipes and data',
    icon: 'i-heroicons-arrow-down-tray',
    to: '/settings/export',
  },
]
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 sm:px-6 py-8">
    <h1 class="text-3xl font-bold text-neutral-700 dark:text-neutral-50 mb-2">
      Settings
    </h1>
    <p class="text-neutral-500 dark:text-neutral-400 mb-8">
      Manage your account and preferences
    </p>

    <!-- Profile Summary -->
    <NuxtLink
      to="/settings/profile"
      class="block mb-6"
    >
      <UCard class="hover:border-primary-500 transition-colors cursor-pointer">
        <div class="flex items-center gap-4">
          <div
            v-if="user?.avatar"
            class="w-16 h-16 rounded-full overflow-hidden ring-2 ring-neutral-100 dark:ring-neutral-700"
          >
            <img
              :src="user.avatar"
              :alt="user.name || 'Profile'"
              class="w-full h-full object-cover"
            >
          </div>
          <div
            v-else
            class="w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center ring-2 ring-neutral-100 dark:ring-neutral-700"
          >
            <span class="text-2xl font-display text-white">
              {{ user?.name?.charAt(0).toUpperCase() || 'U' }}
            </span>
          </div>
          <div class="flex-1">
            <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">
              {{ user?.name || 'User' }}
            </h2>
            <p class="text-sm text-neutral-500 dark:text-neutral-400">
              {{ user?.username ? `@${user.username}` : user?.email }}
            </p>
          </div>
          <UIcon
            name="i-heroicons-pencil"
            class="w-5 h-5 text-neutral-400"
          />
        </div>
      </UCard>
    </NuxtLink>

    <!-- Settings List -->
    <div class="space-y-2">
      <NuxtLink
        v-for="item in settingsItems"
        :key="item.to"
        :to="item.to"
        class="block p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-primary-500 transition-colors"
      >
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center">
            <UIcon
              :name="item.icon"
              class="w-5 h-5 text-neutral-600 dark:text-neutral-400"
            />
          </div>
          <div class="flex-1">
            <h3 class="font-medium text-neutral-700 dark:text-neutral-100">
              {{ item.title }}
            </h3>
            <p class="text-sm text-neutral-500 dark:text-neutral-400">
              {{ item.description }}
            </p>
          </div>
          <UIcon
            name="i-heroicons-chevron-right"
            class="w-5 h-5 text-neutral-400"
          />
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
