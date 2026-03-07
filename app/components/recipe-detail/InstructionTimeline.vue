<script setup lang="ts">
interface Instruction {
  id: number
  stepNumber: number
  content: string
  timerMinutes: number | null
}

interface Props {
  instructions: Instruction[]
}

defineProps<Props>()

// Track completed steps (local state)
const completedSteps = ref<Set<number>>(new Set())

function toggleStep(id: number): void {
  if (completedSteps.value.has(id)) {
    completedSteps.value.delete(id)
  } else {
    completedSteps.value.add(id)
  }
}

function isCompleted(id: number): boolean {
  return completedSteps.value.has(id)
}

function formatTime(minutes: number | null): string {
  if (!minutes) return ''
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`
}
</script>

<template>
  <div>
    <!-- Section Header -->
    <div class="flex items-center gap-3 mb-6">
      <span class="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
        <UIcon
          name="i-heroicons-queue-list"
          class="w-5 h-5 text-primary-600 dark:text-primary-400"
        />
      </span>
      <h2 class="text-xl font-display text-neutral-700 dark:text-neutral-100">
        Instructions
      </h2>
    </div>

    <!-- Timeline -->
    <div class="relative pl-14">
      <!-- Steps -->
      <div class="space-y-6">
        <div
          v-for="(instruction, index) in instructions"
          :key="instruction.id"
          class="relative group"
        >
          <!-- Timeline Line Segment (only between steps, not above first or below last) -->
          <div
            v-if="index < instructions.length - 1"
            class="absolute left-[-25px] top-1/2 w-0.5 h-[calc(100%+24px)] bg-primary-200 dark:bg-primary-800"
          />

          <!-- Timeline Dot/Number (vertically centered with card) -->
          <button
            type="button"
            class="absolute -left-10 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 z-10"
            :class="[
              isCompleted(instruction.id)
                ? 'bg-sage-500 text-white scale-90'
                : 'bg-primary-500 text-white hover:scale-110'
            ]"
            @click="toggleStep(instruction.id)"
          >
            <UIcon
              v-if="isCompleted(instruction.id)"
              name="i-heroicons-check"
              class="w-4 h-4"
            />
            <span v-else>{{ instruction.stepNumber }}</span>
          </button>

          <!-- Step Card -->
          <div
            class="p-4 rounded-xl transition-all duration-200"
            :class="[
              isCompleted(instruction.id)
                ? 'bg-sage-50 dark:bg-sage-900/20 opacity-75'
                : 'bg-neutral-100 dark:bg-neutral-800 hover:shadow-md'
            ]"
          >
            <!-- Content -->
            <p
              class="text-neutral-700 dark:text-neutral-200 leading-relaxed"
              :class="{ 'line-through text-neutral-400 dark:text-neutral-500': isCompleted(instruction.id) }"
            >
              {{ instruction.content }}
            </p>

            <!-- Timer Badge -->
            <div
              v-if="instruction.timerMinutes"
              class="mt-3 flex items-center gap-2"
            >
              <UBadge
                color="warning"
                variant="soft"
                class="inline-flex items-center gap-1.5"
              >
                <UIcon
                  name="i-heroicons-clock"
                  class="w-3.5 h-3.5"
                />
                {{ formatTime(instruction.timerMinutes) }}
              </UBadge>

              <!-- Start Timer Button -->
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                icon="i-heroicons-play"
                class="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Start Timer
              </UButton>
            </div>

            <!-- Mark Complete Button (hover) -->
            <div class="mt-3 flex justify-end">
              <UButton
                size="xs"
                :color="isCompleted(instruction.id) ? 'success' : 'neutral'"
                variant="ghost"
                :icon="isCompleted(instruction.id) ? 'i-heroicons-arrow-uturn-left' : 'i-heroicons-check'"
                class="opacity-0 group-hover:opacity-100 transition-opacity"
                @click="toggleStep(instruction.id)"
              >
                {{ isCompleted(instruction.id) ? 'Undo' : 'Mark done' }}
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Completion Message -->
    <Transition
      enter-active-class="transition-all duration-300"
      leave-active-class="transition-all duration-300"
      enter-from-class="opacity-0 translate-y-2"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div
        v-if="completedSteps.size === instructions.length && instructions.length > 0"
        class="mt-8 p-6 bg-sage-50 dark:bg-sage-900/30 rounded-xl text-center"
      >
        <div class="w-12 h-12 rounded-full bg-sage-500 text-white flex items-center justify-center mx-auto mb-3">
          <UIcon
            name="i-heroicons-check"
            class="w-6 h-6"
          />
        </div>
        <p class="text-sage-700 dark:text-sage-300 font-medium">
          All steps completed!
        </p>
        <p class="text-sm text-sage-600 dark:text-sage-400 mt-1">
          Your dish is ready to serve
        </p>
      </div>
    </Transition>
  </div>
</template>
