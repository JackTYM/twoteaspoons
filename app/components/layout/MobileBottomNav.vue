<script setup lang="ts">
const route = useRoute()
const { isAuthenticated, isAnonymous } = useAuth()

// User needs a real (non-anonymous) account for protected features
const isRealUser = computed(() => isAuthenticated.value && !isAnonymous.value)

interface NavItem {
  label: string
  icon: string
  iconActive?: string
  to: string
  requiresAuth?: boolean
}

// Bottom nav items: Browse, Saved, Cookbooks, Shopping, Meal Plan
const navItems: NavItem[] = [
  { label: 'Browse', icon: 'i-heroicons-magnifying-glass', iconActive: 'i-heroicons-magnifying-glass', to: '/browse' },
  { label: 'Saved', icon: 'i-heroicons-bookmark', iconActive: 'i-heroicons-bookmark-solid', to: '/saved', requiresAuth: true },
  { label: 'Cookbooks', icon: 'i-heroicons-book-open', iconActive: 'i-heroicons-book-open-solid', to: '/collections', requiresAuth: true },
  { label: 'Shopping', icon: 'i-heroicons-shopping-cart', iconActive: 'i-heroicons-shopping-cart-solid', to: '/shopping', requiresAuth: true },
  { label: 'Meal Plan', icon: 'i-heroicons-calendar', iconActive: 'i-heroicons-calendar-solid', to: '/meal-plan', requiresAuth: true },
]

function isActive(path: string): boolean {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}

function getItemIcon(item: NavItem): string {
  return isActive(item.to) && item.iconActive ? item.iconActive : item.icon
}

function handleNavClick(item: NavItem): void {
  if (item.requiresAuth && !isRealUser.value) {
    navigateTo('/auth/signin')
  }
}
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 z-50 bg-neutral-50/95 dark:bg-neutral-950/95 backdrop-blur-md border-t border-neutral-200 dark:border-neutral-800 safe-area-bottom">
    <div class="flex items-stretch justify-around max-w-lg mx-auto">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.requiresAuth && !isRealUser ? '/auth/signin' : item.to"
        class="flex-1 flex flex-col items-center justify-center py-2 pt-2.5 gap-0.5 transition-colors duration-200"
        :class="[
          isActive(item.to)
            ? 'text-primary-600 dark:text-primary-400'
            : 'text-neutral-400 dark:text-neutral-500',
        ]"
        @click="handleNavClick(item)"
      >
        <span
          class="relative w-10 h-7 flex items-center justify-center rounded-full transition-all duration-200"
          :class="{ 'bg-primary-100 dark:bg-primary-900/40': isActive(item.to) }"
        >
          <UIcon
            :name="getItemIcon(item)"
            class="w-5 h-5 transition-transform duration-200"
            :class="{ 'scale-110': isActive(item.to) }"
          />
          <span
            v-if="item.requiresAuth && !isRealUser"
            class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-neutral-300 dark:bg-neutral-600 rounded-full"
          />
        </span>
        <span
          class="text-[10px] font-medium transition-colors duration-200"
          :class="[
            isActive(item.to)
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-neutral-500 dark:text-neutral-400',
          ]"
        >
          {{ item.label }}
        </span>
      </NuxtLink>
    </div>
  </nav>
</template>

<style scoped>
/* Safe area for devices with home indicator */
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0);
}
</style>
