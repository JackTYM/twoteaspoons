<script setup lang="ts">
interface Props {
  variant?: 'default' | 'small' | 'large'
}

withDefaults(defineProps<Props>(), {
  variant: 'default',
})
</script>

<template>
  <div
    class="relative overflow-hidden bg-pattern"
    :class="{
      'aspect-video': variant === 'default' || variant === 'large',
      'aspect-square': variant === 'small',
    }"
  >
    <!-- Gradient background -->
    <div class="absolute inset-0 bg-gradient-to-br from-neutral-100 via-neutral-50 to-neutral-100 dark:from-neutral-800 dark:via-neutral-850 dark:to-neutral-800" />

    <!-- Decorative shapes -->
    <div class="absolute inset-0 overflow-hidden opacity-30 dark:opacity-20">
      <!-- Circle decoration -->
      <div class="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-primary-200 dark:bg-primary-800" />
      <div class="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-warning-200 dark:bg-warning-800" />
    </div>

    <!-- Center illustration -->
    <div class="absolute inset-0 flex items-center justify-center">
      <svg
        class="text-neutral-300 dark:text-neutral-600"
        :class="{
          'w-16 h-16': variant === 'small',
          'w-20 h-20': variant === 'default',
          'w-28 h-28': variant === 'large',
        }"
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <!-- Plate -->
        <ellipse
          cx="40"
          cy="50"
          rx="32"
          ry="8"
          class="fill-neutral-200 dark:fill-neutral-700"
        />
        <ellipse
          cx="40"
          cy="46"
          rx="28"
          ry="6"
          class="fill-neutral-100 dark:fill-neutral-800"
          stroke="currentColor"
          stroke-width="1.5"
        />

        <!-- Fork -->
        <g transform="translate(18, 12) rotate(-20)">
          <rect
            x="0"
            y="12"
            width="2"
            height="24"
            rx="1"
            class="fill-primary-400 dark:fill-primary-500"
          />
          <rect
            x="0"
            y="0"
            width="2"
            height="8"
            rx="0.5"
            class="fill-primary-400 dark:fill-primary-500"
          />
          <rect
            x="4"
            y="0"
            width="2"
            height="8"
            rx="0.5"
            class="fill-primary-400 dark:fill-primary-500"
          />
          <rect
            x="8"
            y="0"
            width="2"
            height="8"
            rx="0.5"
            class="fill-primary-400 dark:fill-primary-500"
          />
          <rect
            x="0"
            y="8"
            width="10"
            height="4"
            rx="1"
            class="fill-primary-400 dark:fill-primary-500"
          />
        </g>

        <!-- Knife -->
        <g transform="translate(54, 8) rotate(20)">
          <rect
            x="0"
            y="16"
            width="3"
            height="24"
            rx="1.5"
            class="fill-neutral-400 dark:fill-neutral-500"
          />
          <path
            d="M0 0L3 0L3 16L0 12Z"
            class="fill-neutral-400 dark:fill-neutral-500"
          />
        </g>

        <!-- Steam lines (wavy curves) -->
        <path
          d="M34 32 Q36 28 34 24 Q32 20 34 16"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          fill="none"
          class="opacity-40"
        />
        <path
          d="M42 30 Q44 26 42 22 Q40 18 42 14"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          fill="none"
          class="opacity-40"
        />
        <path
          d="M50 32 Q52 28 50 24 Q48 20 50 16"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          fill="none"
          class="opacity-40"
        />
      </svg>
    </div>

    <!-- Subtle brand watermark -->
    <div class="absolute bottom-2 right-2 opacity-20">
      <svg
        class="w-6 h-6"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <!-- Two spoons icon -->
        <ellipse
          cx="8"
          cy="6"
          rx="4"
          ry="5"
          class="fill-primary-500 dark:fill-primary-400"
        />
        <rect
          x="7"
          y="10"
          width="2"
          height="12"
          rx="1"
          class="fill-primary-500 dark:fill-primary-400"
        />
        <ellipse
          cx="16"
          cy="8"
          rx="4"
          ry="5"
          class="fill-primary-400 dark:fill-primary-500"
        />
        <rect
          x="15"
          y="12"
          width="2"
          height="10"
          rx="1"
          class="fill-primary-400 dark:fill-primary-500"
        />
      </svg>
    </div>
  </div>
</template>
