<script setup lang="ts">
const { user, isAuthenticated, isLoading, signOut, fetchSession } = useAuth()
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

// Fetch session on mount
onMounted(() => {
  fetchSession()
})

async function handleSignOut(): Promise<void> {
  await signOut()
  navigateTo('/')
}

const dropdownItems = computed(() => [
  [{
    label: user.value?.name || 'Account',
    slot: 'account',
    disabled: true,
  }],
  [{
    label: 'Sign out',
    icon: 'i-heroicons-arrow-right-on-rectangle',
    click: handleSignOut,
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
    <!-- Header -->
    <header class="sticky top-0 z-40 bg-neutral-50/80 dark:bg-neutral-950/80 backdrop-blur-sm border-b border-neutral-200 dark:border-neutral-800">
      <div class="max-w-6xl mx-auto px-4 sm:px-6">
        <div class="flex items-center justify-between h-16">
          <!-- Logo -->
          <NuxtLink
            to="/"
            class="flex items-center gap-2"
          >
            <img
              src="/images/logo.svg"
              alt="TwoTeaspoons"
              class="w-8 h-8 dark:brightness-150"
            >
            <span class="font-display font-semibold text-lg text-neutral-700 dark:text-neutral-100 hidden sm:block">
              TwoTeaspoons
            </span>
          </NuxtLink>

          <!-- Navigation -->
          <nav class="flex items-center gap-2">
            <template v-if="!isLoading">
              <template v-if="isAuthenticated">
                <UButton
                  to="/recipes"
                  variant="ghost"
                  color="neutral"
                >
                  My Recipes
                </UButton>
                <UDropdown :items="addRecipeItems">
                  <UButton
                    color="primary"
                    icon="i-heroicons-plus"
                    trailing-icon="i-heroicons-chevron-down"
                  >
                    <span class="hidden sm:inline">Add</span>
                  </UButton>
                </UDropdown>
                <UDropdown :items="dropdownItems">
                  <UButton
                    color="neutral"
                    variant="ghost"
                    icon="i-heroicons-user-circle"
                    class="rounded-full"
                  />
                </UDropdown>
              </template>
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
            </template>

            <!-- Color mode toggle -->
            <UButton
              :icon="icon"
              color="neutral"
              variant="ghost"
              size="sm"
              class="rounded-full"
              aria-label="Toggle color mode"
              @click="isDark = !isDark"
            />
          </nav>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="px-6 py-8 text-center text-neutral-500 dark:text-neutral-400 border-t border-neutral-200 dark:border-neutral-800">
      <p>&copy; {{ new Date().getFullYear() }} TwoTeaspoons. Made with love for home cooks.</p>
    </footer>
  </div>
</template>
