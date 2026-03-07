<script setup lang="ts">
interface Props {
  mealsPlanned: number
  totalSlots: number
  generating: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  generateList: []
}>()

const progress = computed(() =>
  props.totalSlots > 0 ? (props.mealsPlanned / props.totalSlots) * 100 : 0
)

const progressColor = computed(() => {
  if (progress.value === 100) return 'bg-sage-500'
  if (progress.value >= 50) return 'bg-primary-500'
  return 'bg-butter-500'
})

const statusText = computed(() => {
  if (progress.value === 100) return 'Week complete!'
  if (progress.value >= 75) return 'Almost there!'
  if (progress.value >= 50) return 'Halfway planned'
  if (progress.value > 0) return 'Getting started'
  return 'No meals planned'
})
</script>

<template>
  <div class="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
    <!-- Progress Section -->
    <div class="flex-1 w-full sm:w-auto">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium text-neutral-700 dark:text-neutral-200">
          {{ mealsPlanned }} of {{ totalSlots }} meals planned
        </span>
        <span class="text-xs text-neutral-500 dark:text-neutral-400">
          {{ statusText }}
        </span>
      </div>
      <div class="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-500"
          :class="progressColor"
          :style="{ width: `${progress}%` }"
        />
      </div>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-3">
      <UButton
        v-if="mealsPlanned > 0"
        color="primary"
        icon="i-heroicons-shopping-cart"
        :loading="generating"
        class="press-effect"
        @click="emit('generateList')"
      >
        <span class="hidden sm:inline">Generate Shopping List</span>
        <span class="sm:hidden">Shop</span>
      </UButton>
    </div>
  </div>
</template>
