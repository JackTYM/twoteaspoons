<script setup lang="ts">
interface Props {
  title?: string
  subtitle?: string
}

withDefaults(defineProps<Props>(), {
  title: '',
  subtitle: '',
})
</script>

<template>
  <div class="min-h-screen flex">
    <!-- Branding Panel (hidden on mobile) -->
    <div class="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-500 via-primary-600 to-terracotta-600 p-12 flex-col justify-between relative overflow-hidden">
      <!-- Background Pattern -->
      <div class="absolute inset-0 opacity-10">
        <svg
          class="w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <pattern
            id="grid"
            width="10"
            height="10"
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx="5"
              cy="5"
              r="1"
              fill="white"
            />
          </pattern>
          <rect
            width="100%"
            height="100%"
            fill="url(#grid)"
          />
        </svg>
      </div>

      <!-- Logo & Tagline -->
      <div class="relative z-10">
        <div class="flex items-center gap-3">
          <img
            src="/images/logo.svg"
            alt="TwoTeaspoons"
            class="h-10 brightness-0 invert"
          >
          <span class="text-white text-xl font-display">TwoTeaspoons</span>
        </div>
        <p class="text-white/80 mt-2 text-lg">
          Recipes worth sharing
        </p>
      </div>

      <!-- Quote -->
      <div class="relative z-10">
        <blockquote class="text-2xl md:text-3xl font-display text-white italic leading-relaxed">
          "Finally, a recipe app that feels like home."
        </blockquote>
        <p class="mt-4 text-white/70">
          — Happy Home Cook
        </p>
      </div>

      <!-- Feature Highlights -->
      <div class="relative z-10 flex flex-wrap gap-4">
        <div class="flex items-center gap-2 text-white/80 text-sm">
          <UIcon
            name="i-heroicons-book-open"
            class="w-5 h-5"
          />
          <span>Save unlimited recipes</span>
        </div>
        <div class="flex items-center gap-2 text-white/80 text-sm">
          <UIcon
            name="i-heroicons-calendar"
            class="w-5 h-5"
          />
          <span>Plan your meals</span>
        </div>
        <div class="flex items-center gap-2 text-white/80 text-sm">
          <UIcon
            name="i-heroicons-shopping-cart"
            class="w-5 h-5"
          />
          <span>Smart shopping lists</span>
        </div>
      </div>

      <!-- Decorative Elements -->
      <div class="absolute -bottom-20 -right-20 w-64 h-64 rounded-full bg-white/5" />
      <div class="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/5" />
    </div>

    <!-- Form Panel -->
    <div class="flex-1 flex items-center justify-center p-6 sm:p-8 bg-neutral-50 dark:bg-neutral-950">
      <div class="w-full max-w-md animate-fade-in">
        <!-- Mobile Logo -->
        <div class="lg:hidden text-center mb-8">
          <img
            src="/images/logo.svg"
            alt="TwoTeaspoons"
            class="h-10 mx-auto"
          >
          <p class="text-neutral-500 dark:text-neutral-400 text-sm mt-2">
            Recipes worth sharing
          </p>
        </div>

        <!-- Header (if provided) -->
        <div
          v-if="title"
          class="text-center mb-8"
        >
          <h1 class="text-3xl font-display text-neutral-700 dark:text-neutral-50">
            {{ title }}
          </h1>
          <p
            v-if="subtitle"
            class="text-neutral-500 dark:text-neutral-400 mt-2"
          >
            {{ subtitle }}
          </p>
        </div>

        <!-- Slot Content -->
        <slot />
      </div>
    </div>
  </div>
</template>
