<script setup lang="ts">
interface Props {
  name: string
  itemCount: number
  checkedCount: number
  mode?: 'create' | 'edit'
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'edit',
})

const emit = defineEmits<{
  'update:name': [value: string]
}>()

const breadcrumbLabel = computed(() => props.mode === 'create' ? 'New List' : 'Edit List')

const localName = computed({
  get: () => props.name,
  set: (value) => emit('update:name', value),
})

const progress = computed(() => {
  if (props.itemCount === 0) return 0
  return Math.round((props.checkedCount / props.itemCount) * 100)
})

// SVG circle calculations (radius = 32)
const circumference = 2 * Math.PI * 32
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
          { label: breadcrumbLabel }
        ]"
        class="mb-4"
      />

      <div class="flex items-center gap-6">
        <!-- Progress ring (smaller in edit mode) -->
        <div class="relative w-20 h-20 flex-shrink-0">
          <svg class="w-full h-full -rotate-90">
            <circle
              cx="40"
              cy="40"
              r="32"
              stroke="currentColor"
              stroke-width="6"
              fill="none"
              class="text-neutral-200 dark:text-neutral-700"
            />
            <circle
              cx="40"
              cy="40"
              r="32"
              stroke="currentColor"
              stroke-width="6"
              fill="none"
              stroke-linecap="round"
              class="transition-all duration-700 text-primary-500"
              :stroke-dasharray="circumference"
              :stroke-dashoffset="progressOffset"
            />
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span class="text-lg font-bold text-neutral-700 dark:text-neutral-100">
              {{ progress }}%
            </span>
          </div>
        </div>

        <div class="flex-1">
          <!-- Editable Name -->
          <input
            v-model="localName"
            type="text"
            placeholder="List name..."
            class="w-full text-2xl font-display text-neutral-700 dark:text-neutral-100 bg-transparent border-0 border-b-2 border-dashed border-neutral-300 dark:border-neutral-600 focus:border-primary-500 dark:focus:border-primary-400 focus:ring-0 px-0 py-1 transition-colors"
          >
          <p class="text-neutral-500 dark:text-neutral-400 mt-2">
            {{ checkedCount }} of {{ itemCount }} items checked
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
