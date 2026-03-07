<script setup lang="ts">
interface Props {
  name: string
  checkedCount: number
  totalCount: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  addItem: []
  clearChecked: []
  edit: []
}>()

const progress = computed(() => {
  if (props.totalCount === 0) return 0
  return Math.round((props.checkedCount / props.totalCount) * 100)
})

const allComplete = computed(() => {
  return props.checkedCount === props.totalCount && props.totalCount > 0
})

// SVG circle calculations (radius = 48)
const circumference = 2 * Math.PI * 48

const progressOffset = computed(() => {
  return circumference - (progress.value / 100) * circumference
})
</script>

<template>
  <div class="relative overflow-hidden rounded-xl mb-6">
    <!-- Background -->
    <div class="absolute inset-0 bg-gradient-to-br from-sage-50 to-primary-50 dark:from-sage-950/30 dark:to-primary-950/30" />

    <div class="relative p-6">
      <Breadcrumbs
        :items="[
          { label: 'Shopping', to: '/shopping', icon: 'i-heroicons-shopping-cart' },
          { label: name }
        ]"
        class="mb-4"
      />

      <div class="flex items-center gap-6">
        <!-- Large progress ring -->
        <div class="relative w-28 h-28 flex-shrink-0">
          <svg class="w-full h-full -rotate-90">
            <circle
              cx="56"
              cy="56"
              r="48"
              stroke="currentColor"
              stroke-width="8"
              fill="none"
              class="text-neutral-200 dark:text-neutral-700"
            />
            <circle
              cx="56"
              cy="56"
              r="48"
              stroke="currentColor"
              stroke-width="8"
              fill="none"
              stroke-linecap="round"
              class="transition-all duration-700"
              :class="allComplete ? 'text-sage-500' : 'text-primary-500'"
              :stroke-dasharray="circumference"
              :stroke-dashoffset="progressOffset"
            />
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span class="text-2xl font-bold text-neutral-700 dark:text-neutral-100">
              {{ progress }}%
            </span>
            <span class="text-xs text-neutral-500 dark:text-neutral-400">complete</span>
          </div>
        </div>

        <div class="flex-1">
          <h1 class="text-2xl font-display text-neutral-700 dark:text-neutral-100">
            {{ name }}
          </h1>
          <p class="text-neutral-500 dark:text-neutral-400 mt-1">
            {{ checkedCount }} of {{ totalCount }} items checked
          </p>

          <!-- Quick actions -->
          <div class="flex flex-wrap gap-2 mt-4">
            <UButton
              size="sm"
              color="primary"
              variant="soft"
              icon="i-heroicons-pencil-square"
              class="press-effect"
              @click="emit('edit')"
            >
              Edit List
            </UButton>
            <UButton
              v-if="checkedCount > 0"
              size="sm"
              color="neutral"
              variant="ghost"
              icon="i-heroicons-trash"
              @click="emit('clearChecked')"
            >
              Clear Checked
            </UButton>
          </div>
        </div>
      </div>

      <!-- Celebration overlay -->
      <Transition name="celebration">
        <div
          v-if="allComplete"
          class="absolute inset-0 flex items-center justify-center bg-sage-500/10 backdrop-blur-sm rounded-xl"
        >
          <div class="text-center">
            <div class="w-16 h-16 mx-auto bg-sage-500 rounded-full flex items-center justify-center mb-3 animate-bounce">
              <UIcon
                name="i-heroicons-check"
                class="w-8 h-8 text-white"
              />
            </div>
            <p class="text-lg font-display text-sage-700 dark:text-sage-300">
              Shopping complete!
            </p>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.celebration-enter-active,
.celebration-leave-active {
  transition: all 0.4s ease;
}

.celebration-enter-from,
.celebration-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
