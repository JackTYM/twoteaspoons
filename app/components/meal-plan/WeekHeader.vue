<script setup lang="ts">
interface Props {
  weekStart: Date
}

const props = defineProps<Props>()

const emit = defineEmits<{
  prevWeek: []
  nextWeek: []
  today: []
}>()

function getEndOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + 6)
  return d
}

const weekLabel = computed(() => {
  const start = props.weekStart
  const end = getEndOfWeek(props.weekStart)
  const startMonth = start.toLocaleDateString('en-US', { month: 'long' })
  const endMonth = end.toLocaleDateString('en-US', { month: 'long' })
  const startDay = start.getDate()
  const endDay = end.getDate()
  const year = start.getFullYear()

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} - ${endDay}, ${year}`
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`
})

// Calculate week number
const weekNumber = computed(() => {
  const start = props.weekStart
  const firstDayOfYear = new Date(start.getFullYear(), 0, 1)
  const pastDaysOfYear = (start.getTime() - firstDayOfYear.getTime()) / 86400000
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
})

// Check if current week contains today
const isCurrentWeek = computed(() => {
  const today = new Date()
  const start = props.weekStart
  const end = getEndOfWeek(start)
  return today >= start && today <= end
})
</script>

<template>
  <div class="flex items-center justify-between p-4 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
    <!-- Previous Week -->
    <UButton
      icon="i-heroicons-chevron-left"
      color="neutral"
      variant="ghost"
      size="lg"
      class="press-effect"
      @click="emit('prevWeek')"
    />

    <!-- Week Display -->
    <div class="text-center">
      <Transition
        mode="out-in"
        enter-active-class="transition-all duration-200"
        leave-active-class="transition-all duration-200"
        enter-from-class="opacity-0 translate-x-4"
        leave-to-class="opacity-0 -translate-x-4"
      >
        <div :key="weekLabel">
          <h2 class="text-xl md:text-2xl font-display text-neutral-700 dark:text-neutral-100">
            {{ weekLabel }}
          </h2>
          <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Week {{ weekNumber }}
            <span
              v-if="isCurrentWeek"
              class="ml-2 px-2 py-0.5 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full text-xs font-medium"
            >
              Current
            </span>
          </p>
        </div>
      </Transition>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-2">
      <UButton
        v-if="!isCurrentWeek"
        color="neutral"
        variant="outline"
        size="sm"
        class="press-effect hidden sm:flex"
        @click="emit('today')"
      >
        Today
      </UButton>
      <UButton
        icon="i-heroicons-chevron-right"
        color="neutral"
        variant="ghost"
        size="lg"
        class="press-effect"
        @click="emit('nextWeek')"
      />
    </div>
  </div>
</template>
