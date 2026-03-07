<script setup lang="ts">
interface Props {
  currentStep: number
  totalSteps: number
  recipeUrl?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  prev: []
  next: []
  goTo: [step: number]
  done: []
}>()

// Touch handling for swipe gestures
const touchStartX = ref(0)
const touchEndX = ref(0)

function handleTouchStart(e: TouchEvent): void {
  const touch = e.touches[0]
  if (touch) {
    touchStartX.value = touch.clientX
  }
}

function handleTouchEnd(e: TouchEvent): void {
  const touch = e.changedTouches[0]
  if (touch) {
    touchEndX.value = touch.clientX
    handleSwipe()
  }
}

function handleSwipe(): void {
  const diff = touchStartX.value - touchEndX.value
  const threshold = 50

  if (Math.abs(diff) > threshold) {
    if (diff > 0 && props.currentStep < props.totalSteps - 1) {
      // Swipe left -> next
      emit('next')
    } else if (diff < 0 && props.currentStep > 0) {
      // Swipe right -> prev
      emit('prev')
    }
  }
}

function getStepClass(index: number): string {
  if (index < props.currentStep) {
    return 'bg-primary-500 border-primary-500'
  } else if (index === props.currentStep) {
    return 'bg-primary-500 border-primary-500'
  }
  return 'bg-neutral-700 border-neutral-600'
}
</script>

<template>
  <div
    class="flex items-center justify-between p-4 sm:p-6 border-t border-neutral-700/50"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
  >
    <!-- Previous Button -->
    <UButton
      color="neutral"
      variant="outline"
      size="lg"
      :disabled="currentStep === 0"
      class="min-w-[100px] sm:min-w-[120px]"
      icon="i-heroicons-chevron-left"
      @click="emit('prev')"
    >
      Previous
    </UButton>

    <!-- Step Indicators -->
    <div class="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 flex-1 justify-center">
      <button
        v-for="(_, i) in totalSteps"
        :key="i"
        class="relative w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 transition-all duration-200 flex-shrink-0"
        :class="getStepClass(i)"
        :aria-label="`Go to step ${i + 1}`"
        :aria-current="i === currentStep ? 'step' : undefined"
        @click="emit('goTo', i)"
      >
        <!-- Completed checkmark -->
        <span
          v-if="i < currentStep"
          class="absolute inset-0 flex items-center justify-center"
        >
          <UIcon
            name="i-heroicons-check"
            class="w-2 h-2 sm:w-3 sm:h-3 text-white"
          />
        </span>

        <!-- Current step pulse ring -->
        <span
          v-if="i === currentStep"
          class="absolute -inset-1 rounded-full border-2 border-primary-500 animate-ping opacity-75"
        />
      </button>
    </div>

    <!-- Next/Done Button -->
    <UButton
      v-if="currentStep < totalSteps - 1"
      color="primary"
      size="lg"
      class="min-w-[100px] sm:min-w-[120px] press-effect"
      trailing-icon="i-heroicons-chevron-right"
      @click="emit('next')"
    >
      Next
    </UButton>
    <UButton
      v-else
      color="success"
      size="lg"
      class="min-w-[100px] sm:min-w-[120px] press-effect"
      icon="i-heroicons-check"
      @click="emit('done')"
    >
      Done!
    </UButton>
  </div>
</template>
