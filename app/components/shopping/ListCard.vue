<script setup lang="ts">
interface ShoppingList {
  id: number
  name: string
  slug: string
  createdAt: string
  itemCount: number
  checkedCount: number
}

interface Props {
  list: ShoppingList
}

const props = defineProps<Props>()

const emit = defineEmits<{
  delete: []
}>()

const progress = computed(() => {
  if (props.list.itemCount === 0) return 0
  return Math.round((props.list.checkedCount / props.list.itemCount) * 100)
})

// SVG circle calculations
const circumference = 2 * Math.PI * 28 // radius = 28

const progressOffset = computed(() => {
  return circumference - (progress.value / 100) * circumference
})

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
</script>

<template>
  <NuxtLink
    :to="`/shopping/${list.slug}`"
    class="block group"
  >
    <div class="bg-white dark:bg-neutral-800 rounded-xl p-4 hover-lift transition-all shadow-sm hover:shadow-md">
      <div class="flex items-center gap-4">
        <!-- Progress ring -->
        <div class="relative w-16 h-16 flex-shrink-0">
          <svg class="w-full h-full -rotate-90">
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="currentColor"
              stroke-width="5"
              fill="none"
              class="text-neutral-200 dark:text-neutral-700"
            />
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="currentColor"
              stroke-width="5"
              fill="none"
              stroke-linecap="round"
              class="transition-all duration-500"
              :class="progress === 100 ? 'text-sage-500' : 'text-primary-500'"
              :stroke-dasharray="circumference"
              :stroke-dashoffset="progressOffset"
            />
          </svg>
          <div class="absolute inset-0 flex items-center justify-center">
            <span class="text-sm font-bold text-neutral-700 dark:text-neutral-100">
              {{ progress }}%
            </span>
          </div>
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <h3 class="font-semibold text-neutral-700 dark:text-neutral-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
            {{ list.name }}
          </h3>
          <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            {{ list.checkedCount }} of {{ list.itemCount }} items
          </p>
          <p class="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
            {{ formatDate(list.createdAt) }}
          </p>
        </div>

        <!-- Completion badge or delete button -->
        <div class="flex items-center gap-2">
          <UBadge
            v-if="progress === 100"
            color="success"
            variant="soft"
          >
            <UIcon
              name="i-heroicons-check"
              class="w-3 h-3 mr-1"
            />
            Done
          </UBadge>

          <UButton
            color="error"
            variant="ghost"
            icon="i-heroicons-trash"
            size="sm"
            class="opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Delete shopping list"
            @click.prevent="emit('delete')"
          />
        </div>
      </div>
    </div>
  </NuxtLink>
</template>
