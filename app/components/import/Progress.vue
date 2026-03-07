<script setup lang="ts">
interface Step {
  label: string
  icon: string
}

const steps: Step[] = [
  { label: 'Fetching page...', icon: 'i-heroicons-globe-alt' },
  { label: 'Parsing content...', icon: 'i-heroicons-document-text' },
  { label: 'Extracting recipe...', icon: 'i-heroicons-beaker' },
  { label: 'Almost done...', icon: 'i-heroicons-sparkles' },
]

const currentStep = ref(0)
let interval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  interval = setInterval(() => {
    if (currentStep.value < steps.length - 1) {
      currentStep.value++
    }
  }, 1500)
})

onUnmounted(() => {
  if (interval) {
    clearInterval(interval)
  }
})

const defaultStep: Step = { label: 'Fetching page...', icon: 'i-heroicons-globe-alt' }

const currentStepData = computed((): Step => {
  return steps[currentStep.value] ?? defaultStep
})
</script>

<template>
  <div class="text-center py-8">
    <!-- Animated spinner -->
    <div class="relative w-24 h-24 mx-auto mb-6">
      <!-- Background ring -->
      <div class="absolute inset-0 border-4 border-neutral-200 dark:border-neutral-700 rounded-full" />
      <!-- Spinning ring -->
      <div class="absolute inset-0 border-4 border-primary-500 rounded-full animate-spin border-t-transparent" />
      <!-- Center icon -->
      <div class="absolute inset-2 bg-neutral-50 dark:bg-neutral-800 rounded-full flex items-center justify-center">
        <Transition
          name="icon-swap"
          mode="out-in"
        >
          <UIcon
            :key="currentStepData.icon"
            :name="currentStepData.icon"
            class="w-8 h-8 text-primary-500"
          />
        </Transition>
      </div>
    </div>

    <!-- Step label -->
    <Transition
      name="label-swap"
      mode="out-in"
    >
      <h3
        :key="currentStepData.label"
        class="text-lg font-medium text-neutral-700 dark:text-neutral-100 mb-2"
      >
        {{ currentStepData.label }}
      </h3>
    </Transition>

    <!-- Progress dots -->
    <div class="flex justify-center gap-2 mt-4">
      <div
        v-for="(step, i) in steps"
        :key="step.label"
        class="w-2 h-2 rounded-full transition-all duration-300"
        :class="i <= currentStep ? 'bg-primary-500 scale-110' : 'bg-neutral-300 dark:bg-neutral-600'"
      />
    </div>

    <!-- Skeleton preview -->
    <div class="max-w-sm mx-auto mt-8 bg-white dark:bg-neutral-800 rounded-xl p-4 shadow-lg border border-neutral-200 dark:border-neutral-700">
      <div class="animate-pulse space-y-3">
        <div class="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4" />
        <div class="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2" />
        <div class="h-24 bg-neutral-200 dark:bg-neutral-700 rounded" />
        <div class="flex gap-2">
          <div class="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-16" />
          <div class="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-20" />
        </div>
      </div>
    </div>

    <p class="text-sm text-neutral-400 dark:text-neutral-500 mt-6">
      This may take a few seconds...
    </p>
  </div>
</template>

<style scoped>
.icon-swap-enter-active,
.icon-swap-leave-active {
  transition: all 0.3s ease;
}

.icon-swap-enter-from {
  opacity: 0;
  transform: scale(0.8) rotate(-10deg);
}

.icon-swap-leave-to {
  opacity: 0;
  transform: scale(0.8) rotate(10deg);
}

.label-swap-enter-active,
.label-swap-leave-active {
  transition: all 0.3s ease;
}

.label-swap-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.label-swap-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
