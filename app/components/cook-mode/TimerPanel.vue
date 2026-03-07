<script setup lang="ts">
interface Timer {
  id: number
  label: string
  totalSeconds: number
  remainingSeconds: number
  isRunning: boolean
}

interface Props {
  timers: Timer[]
}

defineProps<Props>()

const emit = defineEmits<{
  start: [id: number]
  pause: [id: number]
  remove: [id: number]
}>()

const circumference = 2 * Math.PI * 36

function progressOffset(timer: Timer): number {
  if (timer.totalSeconds === 0) return circumference
  const progress = timer.remainingSeconds / timer.totalSeconds
  return circumference * (1 - progress)
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
</script>

<template>
  <Transition name="panel">
    <div
      v-if="timers.length > 0"
      class="fixed top-16 right-4 space-y-3 z-40"
    >
      <TransitionGroup name="timer">
        <div
          v-for="timer in timers"
          :key="timer.id"
          class="relative rounded-2xl p-4 shadow-xl border min-w-[140px]"
          :class="[
            timer.remainingSeconds === 0
              ? 'bg-error-900/80 border-error-500 animate-pulse'
              : 'bg-neutral-800/90 border-neutral-700 backdrop-blur-sm'
          ]"
        >
          <!-- Circular progress ring -->
          <div class="relative w-20 h-20 mx-auto">
            <svg
              class="w-full h-full -rotate-90"
              viewBox="0 0 80 80"
            >
              <!-- Background circle -->
              <circle
                cx="40"
                cy="40"
                r="36"
                stroke="currentColor"
                stroke-width="4"
                fill="none"
                class="text-neutral-700"
              />
              <!-- Progress circle -->
              <circle
                cx="40"
                cy="40"
                r="36"
                stroke="currentColor"
                stroke-width="4"
                fill="none"
                stroke-linecap="round"
                class="transition-all duration-1000"
                :class="timer.remainingSeconds === 0 ? 'text-error-500' : 'text-primary-500'"
                :stroke-dasharray="circumference"
                :stroke-dashoffset="progressOffset(timer)"
              />
            </svg>

            <!-- Time display -->
            <div class="absolute inset-0 flex flex-col items-center justify-center">
              <span
                class="font-mono text-xl font-bold"
                :class="timer.remainingSeconds === 0 ? 'text-error-300' : 'text-neutral-100'"
              >
                {{ formatTime(timer.remainingSeconds) }}
              </span>
            </div>
          </div>

          <!-- Label -->
          <p class="text-center text-xs text-neutral-400 mt-2 truncate">
            {{ timer.label }}
          </p>

          <!-- Controls -->
          <div class="flex justify-center gap-2 mt-3">
            <UButton
              v-if="timer.isRunning && timer.remainingSeconds > 0"
              size="xs"
              color="neutral"
              variant="ghost"
              icon="i-heroicons-pause"
              aria-label="Pause timer"
              @click="emit('pause', timer.id)"
            />
            <UButton
              v-else-if="timer.remainingSeconds > 0"
              size="xs"
              color="primary"
              variant="soft"
              icon="i-heroicons-play"
              aria-label="Start timer"
              @click="emit('start', timer.id)"
            />
            <UButton
              size="xs"
              color="error"
              variant="ghost"
              icon="i-heroicons-x-mark"
              aria-label="Remove timer"
              @click="emit('remove', timer.id)"
            />
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Transition>
</template>

<style scoped>
.panel-enter-active,
.panel-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.timer-enter-active,
.timer-leave-active {
  transition: all 0.3s ease;
}

.timer-enter-from {
  opacity: 0;
  transform: scale(0.8);
}

.timer-leave-to {
  opacity: 0;
  transform: scale(0.8) translateX(20px);
}

.timer-move {
  transition: transform 0.3s ease;
}
</style>
