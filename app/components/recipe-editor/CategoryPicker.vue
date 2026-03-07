<script setup lang="ts">
interface Category {
  id: number
  name: string
  slug: string
  icon: string | null
}

interface CategoryGroup {
  type: string
  label: string
  categories: Category[]
}

interface Props {
  modelValue: number[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: number[]]
}>()

// Fetch categories from API
const { data: categoriesData, status } = await useFetch<{
  groups: CategoryGroup[]
  total: number
}>('/api/categories')

const groups = computed(() => categoriesData.value?.groups || [])

// Track expanded sections
const expandedSections = ref<Set<string>>(new Set(['meal', 'cuisine', 'dietary']))

function toggleSection(type: string): void {
  if (expandedSections.value.has(type)) {
    expandedSections.value.delete(type)
  } else {
    expandedSections.value.add(type)
  }
  // Trigger reactivity
  expandedSections.value = new Set(expandedSections.value)
}

// Count selected per section
function getSelectedCount(group: CategoryGroup): number {
  return group.categories.filter(c => props.modelValue.includes(c.id)).length
}

// Toggle category selection
function toggleCategory(categoryId: number): void {
  const current = [...props.modelValue]
  const index = current.indexOf(categoryId)
  if (index === -1) {
    current.push(categoryId)
  } else {
    current.splice(index, 1)
  }
  emit('update:modelValue', current)
}

function isSelected(categoryId: number): boolean {
  return props.modelValue.includes(categoryId)
}

// Total selected count
const totalSelected = computed(() => props.modelValue.length)
</script>

<template>
  <div class="category-picker">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-display text-neutral-700 dark:text-neutral-100">
        Categories
      </h3>
      <span
        v-if="totalSelected > 0"
        class="text-sm text-primary-600 dark:text-primary-400 font-medium"
      >
        {{ totalSelected }} selected
      </span>
    </div>

    <!-- Loading State -->
    <div
      v-if="status === 'pending'"
      class="space-y-3"
    >
      <div
        v-for="i in 3"
        :key="i"
        class="h-12 rounded-lg animate-shimmer"
      />
    </div>

    <!-- Category Groups -->
    <div
      v-else
      class="space-y-2"
    >
      <div
        v-for="group in groups"
        :key="group.type"
        class="border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden"
      >
        <!-- Section Header -->
        <button
          type="button"
          class="w-full flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors text-left"
          @click="toggleSection(group.type)"
        >
          <div class="flex items-center gap-2">
            <UIcon
              :name="expandedSections.has(group.type) ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
              class="w-4 h-4 text-neutral-500 dark:text-neutral-400 transition-transform"
            />
            <span class="font-medium text-neutral-700 dark:text-neutral-100">
              {{ group.label }}
            </span>
          </div>
          <span
            v-if="getSelectedCount(group) > 0"
            class="text-xs bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-full"
          >
            {{ getSelectedCount(group) }}
          </span>
        </button>

        <!-- Section Content -->
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 max-h-0"
          enter-to-class="opacity-100 max-h-96"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 max-h-96"
          leave-to-class="opacity-0 max-h-0"
        >
          <div
            v-if="expandedSections.has(group.type)"
            class="p-3 border-t border-neutral-200 dark:border-neutral-700 overflow-hidden"
          >
            <div class="flex flex-wrap gap-2">
              <button
                v-for="category in group.categories"
                :key="category.id"
                type="button"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150"
                :class="[
                  isSelected(category.id)
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'
                ]"
                @click="toggleCategory(category.id)"
              >
                <UIcon
                  v-if="category.icon && category.icon.startsWith('i-')"
                  :name="category.icon"
                  class="w-3.5 h-3.5"
                />
                <span>{{ category.name }}</span>
                <UIcon
                  v-if="isSelected(category.id)"
                  name="i-heroicons-check"
                  class="w-3.5 h-3.5"
                />
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Selected Summary (shown when collapsed) -->
    <div
      v-if="totalSelected > 0"
      class="mt-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg"
    >
      <p class="text-xs text-primary-700 dark:text-primary-300 mb-2">
        Selected categories:
      </p>
      <div class="flex flex-wrap gap-1.5">
        <span
          v-for="group in groups"
          :key="group.type"
        >
          <span
            v-for="category in group.categories.filter(c => isSelected(c.id))"
            :key="category.id"
            class="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-100 dark:bg-primary-800/50 text-primary-700 dark:text-primary-300 rounded-full text-xs"
          >
            {{ category.name }}
            <button
              type="button"
              class="hover:text-primary-900 dark:hover:text-primary-100"
              @click.stop="toggleCategory(category.id)"
            >
              <UIcon
                name="i-heroicons-x-mark"
                class="w-3 h-3"
              />
            </button>
          </span>
        </span>
      </div>
    </div>
  </div>
</template>
