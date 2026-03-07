<script setup lang="ts">
interface Props {
  format: string
}

const props = defineProps<Props>()

interface FormatTips {
  name: string
  tips: string[]
}

const formatTips: Record<string, FormatTips> = {
  '3x5': {
    name: '3×5 Index Card',
    tips: [
      'Use index card stock for best results',
      'Print at "Actual Size" (no scaling)',
      'Ingredients on front, instructions on back',
    ],
  },
  '4x6': {
    name: '4×6 Card',
    tips: [
      'Photo paper or card stock recommended',
      'Set margins to minimum in print settings',
      'Great for recipe boxes',
    ],
  },
  'a6': {
    name: 'A6',
    tips: [
      'Standard A6 paper (105×148mm)',
      'Can fit in most planners',
      'Print borderless if available',
    ],
  },
  'half-letter': {
    name: 'Half Letter',
    tips: [
      'Print on letter paper, cut in half',
      'Good for recipe binders',
      'Landscape orientation recommended',
    ],
  },
  'full': {
    name: 'Full Page',
    tips: [
      'Standard letter or A4 paper',
      'Best for detailed recipes',
      'Includes all content on one page',
    ],
  },
}

const defaultTips: FormatTips = {
  name: '3×5 Index Card',
  tips: [
    'Use index card stock for best results',
    'Print at "Actual Size" (no scaling)',
    'Ingredients on front, instructions on back',
  ],
}

const currentTips = computed((): FormatTips => {
  return formatTips[props.format] ?? defaultTips
})
</script>

<template>
  <div class="p-4 rounded-xl bg-butter-50 dark:bg-butter-900/20 border border-butter-200 dark:border-butter-800/50">
    <div class="flex items-start gap-3">
      <div class="w-8 h-8 rounded-lg bg-butter-100 dark:bg-butter-800/50 flex items-center justify-center flex-shrink-0">
        <UIcon
          name="i-heroicons-light-bulb"
          class="w-4 h-4 text-butter-600 dark:text-butter-400"
        />
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-medium text-butter-800 dark:text-butter-200 text-sm mb-2">
          Print Tips for {{ currentTips.name }}
        </p>
        <ul class="text-sm text-butter-700 dark:text-butter-300 space-y-1">
          <li
            v-for="tip in currentTips.tips"
            :key="tip"
            class="flex items-start gap-2"
          >
            <UIcon
              name="i-heroicons-check-circle"
              class="w-4 h-4 text-butter-500 flex-shrink-0 mt-0.5"
            />
            <span>{{ tip }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
