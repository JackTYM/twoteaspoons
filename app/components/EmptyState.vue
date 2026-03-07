<script setup lang="ts">
interface Props {
  type?: 'recipes' | 'collections' | 'shopping' | 'meal-plan' | 'comments' | 'search' | 'saved' | 'generic'
  title: string
  description?: string
  actionLabel?: string
  actionTo?: string
  actionIcon?: string
}

withDefaults(defineProps<Props>(), {
  type: 'generic',
  description: '',
  actionLabel: '',
  actionTo: '',
  actionIcon: 'i-heroicons-plus',
})

const emit = defineEmits<{
  action: []
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center py-12 px-4 animate-fade-in">
    <!-- Illustration -->
    <div class="relative mb-6">
      <!-- Decorative background circle -->
      <div class="absolute inset-0 -m-4 rounded-full bg-gradient-warm opacity-60" />

      <!-- Recipes illustration -->
      <svg
        v-if="type === 'recipes'"
        class="relative w-32 h-32"
        viewBox="0 0 128 128"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <!-- Recipe book -->
        <rect
          x="24"
          y="28"
          width="80"
          height="72"
          rx="4"
          stroke-width="2"
          class="fill-neutral-100 dark:fill-neutral-800 stroke-neutral-400 dark:stroke-neutral-600"
        />
        <!-- Book spine -->
        <rect
          x="24"
          y="28"
          width="12"
          height="72"
          class="fill-primary-200 dark:fill-primary-800"
        />
        <!-- Page lines -->
        <line
          x1="48"
          y1="44"
          x2="92"
          y2="44"
          stroke-width="2"
          stroke-linecap="round"
          class="stroke-neutral-300 dark:stroke-neutral-600"
        />
        <line
          x1="48"
          y1="56"
          x2="84"
          y2="56"
          stroke-width="2"
          stroke-linecap="round"
          class="stroke-neutral-300 dark:stroke-neutral-600"
        />
        <line
          x1="48"
          y1="68"
          x2="88"
          y2="68"
          stroke-width="2"
          stroke-linecap="round"
          class="stroke-neutral-300 dark:stroke-neutral-600"
        />
        <!-- Bookmark -->
        <path
          d="M76 28V16L82 22L88 16V28"
          class="fill-primary-500"
        />
        <!-- Steam/aroma lines -->
        <path
          d="M100 20C100 20 104 16 104 12M108 24C108 24 112 20 112 16M96 28C96 28 100 24 100 20"
          stroke-width="2"
          stroke-linecap="round"
          class="stroke-primary-400 dark:stroke-primary-500"
        />
      </svg>

      <!-- Collections illustration -->
      <svg
        v-else-if="type === 'collections'"
        class="relative w-32 h-32"
        viewBox="0 0 128 128"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <!-- Folder back -->
        <path
          d="M20 40C20 36.6863 22.6863 34 26 34H48L56 44H102C105.314 44 108 46.6863 108 50V96C108 99.3137 105.314 102 102 102H26C22.6863 102 20 99.3137 20 96V40Z"
          class="fill-neutral-200 dark:fill-neutral-700"
        />
        <!-- Small cards peeking out (behind folder front) -->
        <rect
          x="30"
          y="38"
          width="22"
          height="20"
          rx="2"
          class="fill-warning-300 dark:fill-warning-700"
        />
        <rect
          x="76"
          y="42"
          width="22"
          height="20"
          rx="2"
          class="fill-success-300 dark:fill-success-700"
        />
        <!-- Folder front (covers bottom of cards) -->
        <rect
          x="20"
          y="50"
          width="88"
          height="52"
          rx="4"
          stroke-width="2"
          class="fill-neutral-100 dark:fill-neutral-800 stroke-neutral-300 dark:stroke-neutral-600"
        />
        <!-- Heart icon -->
        <path
          d="M64 68C64 68 52 60 52 72C52 80 64 88 64 88C64 88 76 80 76 72C76 60 64 68 64 68Z"
          class="fill-primary-400 dark:fill-primary-500"
        />
      </svg>

      <!-- Shopping illustration -->
      <svg
        v-else-if="type === 'shopping'"
        class="relative w-32 h-32"
        viewBox="0 0 128 128"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <!-- Bag handles (behind everything) -->
        <path
          d="M48 48V36C48 27.1634 55.1634 20 64 20C72.8366 20 80 27.1634 80 36V48"
          stroke-width="3"
          stroke-linecap="round"
          class="stroke-neutral-400 dark:stroke-neutral-600"
          fill="none"
        />
        <!-- Items peeking out (behind bag) -->
        <ellipse
          cx="48"
          cy="42"
          rx="10"
          ry="16"
          class="fill-success-400 dark:fill-success-500"
        />
        <ellipse
          cx="80"
          cy="40"
          rx="12"
          ry="18"
          class="fill-primary-400 dark:fill-primary-500"
        />
        <rect
          x="60"
          y="30"
          width="8"
          height="28"
          rx="3"
          class="fill-warning-400 dark:fill-warning-500"
        />
        <!-- Shopping bag (covers bottom of items) -->
        <path
          d="M32 48L24 108C24 110.209 25.7909 112 28 112H100C102.209 112 104 110.209 104 108L96 48H32Z"
          stroke-width="2"
          class="fill-neutral-100 dark:fill-neutral-800 stroke-neutral-400 dark:stroke-neutral-600"
        />
        <!-- Checkmark -->
        <circle
          cx="100"
          cy="28"
          r="12"
          class="fill-success-500"
        />
        <path
          d="M94 28L98 32L106 24"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="stroke-white"
        />
      </svg>

      <!-- Meal plan illustration -->
      <svg
        v-else-if="type === 'meal-plan'"
        class="relative w-32 h-32"
        viewBox="0 0 128 128"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <!-- Calendar base -->
        <rect
          x="20"
          y="32"
          width="88"
          height="80"
          rx="6"
          stroke-width="2"
          class="fill-neutral-100 dark:fill-neutral-800 stroke-neutral-300 dark:stroke-neutral-600"
        />
        <!-- Calendar header -->
        <rect
          x="20"
          y="32"
          width="88"
          height="20"
          rx="6"
          class="fill-primary-500"
        />
        <!-- Calendar rings -->
        <rect
          x="40"
          y="24"
          width="4"
          height="16"
          rx="2"
          class="fill-neutral-400 dark:fill-neutral-500"
        />
        <rect
          x="84"
          y="24"
          width="4"
          height="16"
          rx="2"
          class="fill-neutral-400 dark:fill-neutral-500"
        />
        <!-- Grid cells with food icons -->
        <rect
          x="28"
          y="60"
          width="20"
          height="16"
          rx="2"
          class="fill-warning-200 dark:fill-warning-800"
        />
        <rect
          x="54"
          y="60"
          width="20"
          height="16"
          rx="2"
          class="fill-success-200 dark:fill-success-800"
        />
        <rect
          x="80"
          y="60"
          width="20"
          height="16"
          rx="2"
          class="fill-primary-200 dark:fill-primary-800"
        />
        <rect
          x="28"
          y="84"
          width="20"
          height="16"
          rx="2"
          class="fill-success-200 dark:fill-success-800"
        />
        <rect
          x="54"
          y="84"
          width="20"
          height="16"
          rx="2"
          class="fill-primary-200 dark:fill-primary-800"
        />
        <!-- Plus icon in empty cell -->
        <circle
          cx="90"
          cy="92"
          r="8"
          class="fill-neutral-200 dark:fill-neutral-700"
        />
        <path
          d="M90 88V96M86 92H94"
          stroke-width="2"
          stroke-linecap="round"
          class="stroke-neutral-400 dark:stroke-neutral-500"
        />
      </svg>

      <!-- Comments illustration -->
      <svg
        v-else-if="type === 'comments'"
        class="relative w-32 h-32"
        viewBox="0 0 128 128"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <!-- Main speech bubble -->
        <path
          d="M24 32C24 27.5817 27.5817 24 32 24H96C100.418 24 104 27.5817 104 32V72C104 76.4183 100.418 80 96 80H56L40 96V80H32C27.5817 80 24 76.4183 24 72V32Z"
          stroke-width="2"
          class="fill-neutral-100 dark:fill-neutral-800 stroke-neutral-300 dark:stroke-neutral-600"
        />
        <!-- Dots indicating typing/message -->
        <circle
          cx="48"
          cy="52"
          r="5"
          class="fill-neutral-300 dark:fill-neutral-600"
        />
        <circle
          cx="64"
          cy="52"
          r="5"
          class="fill-neutral-400 dark:fill-neutral-500"
        />
        <circle
          cx="80"
          cy="52"
          r="5"
          class="fill-primary-400 dark:fill-primary-500"
        />
        <!-- Small heart -->
        <path
          d="M92 92C92 92 86 88 86 94C86 98 92 102 92 102C92 102 98 98 98 94C98 88 92 92 92 92Z"
          class="fill-primary-400 dark:fill-primary-500"
        />
      </svg>

      <!-- Search illustration -->
      <svg
        v-else-if="type === 'search'"
        class="relative w-32 h-32"
        viewBox="0 0 128 128"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <!-- Magnifying glass -->
        <circle
          cx="56"
          cy="52"
          r="28"
          stroke-width="3"
          class="fill-neutral-100 dark:fill-neutral-800 stroke-neutral-400 dark:stroke-neutral-600"
        />
        <!-- Glass reflection -->
        <path
          d="M40 40C44 36 52 36 56 40"
          stroke-width="2"
          stroke-linecap="round"
          class="stroke-neutral-300 dark:stroke-neutral-600"
        />
        <!-- Handle -->
        <path
          d="M76 72L100 96"
          stroke-width="6"
          stroke-linecap="round"
          class="stroke-primary-500"
        />
        <!-- Question mark -->
        <path
          d="M52 44C52 44 52 40 56 40C60 40 60 44 60 44C60 48 56 48 56 52"
          stroke-width="2"
          stroke-linecap="round"
          class="stroke-neutral-400 dark:stroke-neutral-500"
        />
        <circle
          cx="56"
          cy="58"
          r="2"
          class="fill-neutral-400 dark:fill-neutral-500"
        />
      </svg>

      <!-- Saved illustration -->
      <svg
        v-else-if="type === 'saved'"
        class="relative w-32 h-32"
        viewBox="0 0 128 128"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <!-- Stack of recipe cards -->
        <rect
          x="32"
          y="44"
          width="64"
          height="56"
          rx="4"
          class="fill-neutral-200 dark:fill-neutral-700"
        />
        <rect
          x="28"
          y="38"
          width="64"
          height="56"
          rx="4"
          class="fill-neutral-150 dark:fill-neutral-750 stroke-neutral-300 dark:stroke-neutral-600"
          stroke-width="1"
        />
        <rect
          x="24"
          y="32"
          width="64"
          height="56"
          rx="4"
          stroke-width="2"
          class="fill-neutral-100 dark:fill-neutral-800 stroke-neutral-300 dark:stroke-neutral-600"
        />
        <!-- Lines on top card -->
        <line
          x1="34"
          y1="48"
          x2="68"
          y2="48"
          stroke-width="2"
          stroke-linecap="round"
          class="stroke-neutral-300 dark:stroke-neutral-600"
        />
        <line
          x1="34"
          y1="58"
          x2="60"
          y2="58"
          stroke-width="2"
          stroke-linecap="round"
          class="stroke-neutral-300 dark:stroke-neutral-600"
        />
        <line
          x1="34"
          y1="68"
          x2="64"
          y2="68"
          stroke-width="2"
          stroke-linecap="round"
          class="stroke-neutral-300 dark:stroke-neutral-600"
        />
        <!-- Large bookmark -->
        <path
          d="M80 24V72L96 60L112 72V24C112 21.7909 110.209 20 108 20H84C81.7909 20 80 21.7909 80 24Z"
          class="fill-primary-500"
        />
        <!-- Small star on bookmark -->
        <circle
          cx="96"
          cy="40"
          r="8"
          class="fill-primary-400"
        />
      </svg>

      <!-- Generic illustration -->
      <svg
        v-else
        class="relative w-32 h-32"
        viewBox="0 0 128 128"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <!-- Bowl -->
        <ellipse
          cx="64"
          cy="80"
          rx="40"
          ry="16"
          class="fill-neutral-200 dark:fill-neutral-700"
        />
        <path
          d="M24 64C24 64 24 80 64 80C104 80 104 64 104 64"
          stroke-width="3"
          class="stroke-neutral-400 dark:stroke-neutral-600"
        />
        <ellipse
          cx="64"
          cy="64"
          rx="40"
          ry="12"
          stroke-width="2"
          class="fill-neutral-100 dark:fill-neutral-800 stroke-neutral-300 dark:stroke-neutral-600"
        />
        <!-- Utensils -->
        <rect
          x="44"
          y="28"
          width="3"
          height="32"
          rx="1.5"
          class="fill-primary-400 dark:fill-primary-500"
          transform="rotate(-15 44 28)"
        />
        <rect
          x="84"
          y="28"
          width="3"
          height="32"
          rx="1.5"
          class="fill-primary-400 dark:fill-primary-500"
          transform="rotate(15 84 28)"
        />
        <!-- Steam -->
        <path
          d="M52 44C52 44 56 40 56 36M64 40C64 40 68 36 68 32M76 44C76 44 80 40 80 36"
          stroke-width="2"
          stroke-linecap="round"
          class="stroke-neutral-300 dark:stroke-neutral-500"
        />
      </svg>
    </div>

    <!-- Text content -->
    <h3 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100 mb-2 text-center">
      {{ title }}
    </h3>
    <p
      v-if="description"
      class="text-neutral-500 dark:text-neutral-400 text-center max-w-sm mb-6"
    >
      {{ description }}
    </p>

    <!-- Action button -->
    <UButton
      v-if="actionLabel"
      :to="actionTo || undefined"
      color="primary"
      :icon="actionIcon"
      class="press-effect"
      @click="!actionTo && emit('action')"
    >
      {{ actionLabel }}
    </UButton>
  </div>
</template>
