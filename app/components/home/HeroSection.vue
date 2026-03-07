<script setup lang="ts">
const search = defineModel<string>('search', { default: '' })

// Rotating taglines
const taglines = [
  'Recipes worth sharing',
  "What's cooking today?",
  'Discover your next favorite dish',
  'Home cooking made simple',
]

const currentIndex = ref(0)
const currentTagline = computed(() => taglines[currentIndex.value])

// Rotate taglines every 4 seconds
let interval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  interval = setInterval(() => {
    currentIndex.value = (currentIndex.value + 1) % taglines.length
  }, 4000)
})

onUnmounted(() => {
  if (interval) {
    clearInterval(interval)
  }
})

// Time-based greeting
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
})
</script>

<template>
  <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cream-50 to-primary-50 dark:from-neutral-900 dark:to-primary-950/50 p-6 sm:p-8 mb-6">
    <!-- Background decoration -->
    <div class="absolute -right-12 -bottom-12 opacity-10 dark:opacity-5">
      <svg
        width="240"
        height="240"
        viewBox="0 0 100 100"
        class="text-primary-500"
      >
        <!-- Stylized spoon shapes -->
        <ellipse
          cx="30"
          cy="70"
          rx="15"
          ry="25"
          fill="currentColor"
          transform="rotate(-30 30 70)"
        />
        <ellipse
          cx="70"
          cy="70"
          rx="15"
          ry="25"
          fill="currentColor"
          transform="rotate(30 70 70)"
        />
        <rect
          x="25"
          y="10"
          width="6"
          height="50"
          rx="3"
          fill="currentColor"
          transform="rotate(-30 28 35)"
        />
        <rect
          x="69"
          y="10"
          width="6"
          height="50"
          rx="3"
          fill="currentColor"
          transform="rotate(30 72 35)"
        />
      </svg>
    </div>

    <!-- Content -->
    <div class="relative z-10 max-w-xl">
      <p class="text-sm text-primary-600 dark:text-primary-400 font-medium mb-1">
        {{ greeting }}
      </p>

      <!-- Rotating tagline with transition -->
      <h1 class="text-2xl sm:text-3xl font-display text-neutral-700 dark:text-neutral-50 mb-2 min-h-[2.5rem] sm:min-h-[3rem]">
        <Transition
          name="tagline"
          mode="out-in"
        >
          <span :key="currentIndex">{{ currentTagline }}</span>
        </Transition>
      </h1>

      <p class="text-neutral-500 dark:text-neutral-400 mb-6 text-sm sm:text-base">
        Discover recipes from home cooks like you
      </p>

      <!-- Search input -->
      <div class="relative max-w-md">
        <UInput
          v-model="search"
          placeholder="Search recipes..."
          size="lg"
          icon="i-heroicons-magnifying-glass"
          class="shadow-sm"
        />
        <div class="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 text-xs text-neutral-400">
          <kbd class="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded border border-neutral-200 dark:border-neutral-700 font-mono">/</kbd>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tagline-enter-active,
.tagline-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.tagline-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.tagline-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
