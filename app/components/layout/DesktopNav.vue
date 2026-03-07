<script setup lang="ts">
const route = useRoute()
const { isAuthenticated, isAnonymous } = useAuth()

// User needs a real (non-anonymous) account for protected features
const isRealUser = computed(() => isAuthenticated.value && !isAnonymous.value)

interface NavItem {
  label: string
  icon: string
  to: string
  requiresAuth?: boolean
}

const navItems: NavItem[] = [
  { label: 'Browse', icon: 'i-heroicons-magnifying-glass', to: '/browse' },
  { label: 'Saved', icon: 'i-heroicons-bookmark', to: '/saved', requiresAuth: true },
  { label: 'Collections', icon: 'i-heroicons-folder', to: '/collections', requiresAuth: true },
  { label: 'Shopping', icon: 'i-heroicons-shopping-cart', to: '/shopping', requiresAuth: true },
  { label: 'Meal Plan', icon: 'i-heroicons-calendar', to: '/meal-plan', requiresAuth: true },
]

function isActive(path: string): boolean {
  // Exact match for home, prefix match for others
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}
</script>

<template>
  <nav class="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-950/80 backdrop-blur-sm">
    <div class="max-w-6xl mx-auto px-4 sm:px-6">
      <div class="flex items-center gap-1 py-2 overflow-x-auto scrollbar-hide">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.requiresAuth && !isRealUser ? '/auth/signin' : item.to"
          class="relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-200 rounded-lg"
          :class="[
            isActive(item.to)
              ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/50'
              : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800',
          ]"
        >
          <UIcon
            :name="item.icon"
            class="w-4 h-4 transition-transform duration-200"
            :class="{ 'scale-110': isActive(item.to) }"
          />
          <span>{{ item.label }}</span>
          <UIcon
            v-if="item.requiresAuth && !isRealUser"
            name="i-heroicons-lock-closed"
            class="w-3 h-3 opacity-50"
          />
        </NuxtLink>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>
