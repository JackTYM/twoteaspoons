<script setup lang="ts">
const { user, isAuthenticated, isAnonymous, signOut, refreshUserProfile } = useAuth()

// Refresh user profile to get username if missing
onMounted(async () => {
  if (isAuthenticated.value && !isAnonymous.value && user.value && !user.value.username) {
    await refreshUserProfile()
  }
})
const colorMode = useColorMode()

const isDark = computed({
  get: () => colorMode.value === 'dark',
  set: () => {
    colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
  },
})

const icon = computed(() =>
  colorMode.value === 'dark' ? 'i-heroicons-moon-solid' : 'i-heroicons-sun-solid'
)

async function handleSignOut(): Promise<void> {
  await signOut()
  window.location.href = '/'
}

const dropdownItems = computed(() => [
  [{
    label: user.value?.name || 'Account',
    slot: 'account',
    disabled: true,
  }],
  [
    ...(user.value?.username ? [{
      label: 'View Profile',
      icon: 'i-heroicons-user',
      to: `/users/${user.value.username}`,
    }] : []),
    {
      label: 'Settings',
      icon: 'i-heroicons-cog-6-tooth',
      to: '/settings',
    },
  ],
  [{
    label: 'Sign out',
    icon: 'i-heroicons-arrow-right-on-rectangle',
    onSelect: handleSignOut,
  }],
])

const addRecipeItems = [
  [{
    label: 'Create from scratch',
    icon: 'i-heroicons-pencil-square',
    to: '/recipes/new',
  }],
  [{
    label: 'Import from URL',
    icon: 'i-heroicons-arrow-down-tray',
    to: '/recipes/import',
  }],
]
</script>

<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col">
    <!-- Skip Link for Accessibility -->
    <a
      href="#main-content"
      class="skip-link"
    >
      Skip to main content
    </a>

    <!-- Header -->
    <header class="sticky top-0 z-40 bg-neutral-50/80 dark:bg-neutral-950/80 backdrop-blur-sm border-b border-neutral-200 dark:border-neutral-800">
      <div class="max-w-6xl mx-auto px-4 sm:px-6">
        <div class="flex items-center justify-between h-16">
          <!-- Logo (links to home) -->
          <NuxtLink
            to="/"
            class="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <img
              src="/images/logo.svg"
              alt="TwoTeaspoons"
              class="w-8 h-8 dark:brightness-150"
            >
            <span class="font-display font-semibold text-lg text-neutral-700 dark:text-neutral-100">
              TwoTeaspoons
            </span>
          </NuxtLink>

          <!-- Right side: Add, Profile, Theme -->
          <nav class="flex items-center gap-2">
            <!-- Authenticated non-anonymous user -->
            <template v-if="isAuthenticated && !isAnonymous">
              <!-- Add Button -->
              <UDropdownMenu :items="addRecipeItems">
                <UButton
                  color="primary"
                  icon="i-heroicons-plus"
                  trailing-icon="i-heroicons-chevron-down"
                  class="press-effect"
                  aria-label="Add new recipe"
                >
                  <span class="hidden sm:inline">New Recipe</span>
                </UButton>
              </UDropdownMenu>

              <!-- Profile -->
              <UDropdownMenu :items="dropdownItems">
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-heroicons-user-circle"
                  class="rounded-full"
                  aria-label="User menu"
                />
              </UDropdownMenu>
            </template>

            <!-- Anonymous or not authenticated: show sign in -->
            <template v-else>
              <UButton
                to="/auth/signin"
                variant="ghost"
                color="neutral"
              >
                Sign in
              </UButton>
              <UButton
                to="/auth/signup"
                color="primary"
              >
                Get Started
              </UButton>
            </template>

            <!-- Color mode toggle -->
            <ClientOnly>
              <UButton
                :icon="icon"
                color="neutral"
                variant="ghost"
                size="sm"
                class="rounded-full"
                aria-label="Toggle color mode"
                @click="isDark = !isDark"
              />
              <template #fallback>
                <UButton
                  icon="i-heroicons-sun-solid"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  class="rounded-full"
                  aria-label="Toggle color mode"
                />
              </template>
            </ClientOnly>
          </nav>
        </div>
      </div>
    </header>

    <!-- Desktop Navigation -->
    <LayoutDesktopNav class="hidden lg:block" />

    <!-- Main Content -->
    <main
      id="main-content"
      class="flex-1 pb-20 lg:pb-0"
    >
      <slot />
    </main>

    <!-- Mobile Bottom Navigation -->
    <LayoutMobileBottomNav class="lg:hidden" />

    <!-- Footer -->
    <footer class="px-6 py-8 text-center text-neutral-500 dark:text-neutral-400 border-t border-neutral-200 dark:border-neutral-800">
      <p>&copy; {{ new Date().getFullYear() }} TwoTeaspoons. Made with love for home cooks.</p>
    </footer>
  </div>
</template>
