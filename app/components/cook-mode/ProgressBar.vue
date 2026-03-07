<script setup lang="ts">
interface Props {
  currentStep: number
  totalSteps: number
}

const props = defineProps<Props>()

const progress = computed(() => {
  if (props.totalSteps === 0) return 0
  return Math.round(((props.currentStep + 1) / props.totalSteps) * 100)
})
</script>

<template>
  <div class="fixed top-0 left-0 right-0 h-1 bg-neutral-800 z-50">
    <div
      class="h-full bg-primary-500 transition-all duration-500 ease-out relative"
      :style="{ width: `${progress}%` }"
    >
      <!-- Glow effect -->
      <div class="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-primary-400 blur-sm" />
    </div>
  </div>
</template>
