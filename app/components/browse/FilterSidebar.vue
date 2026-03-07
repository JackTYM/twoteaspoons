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

interface Filters {
  maxTime: number | null
  minServings: number | null
  maxServings: number | null
  categories: string[] // Category slugs
}

const model = defineModel<Filters>({
  default: () => ({
    maxTime: null,
    minServings: null,
    maxServings: null,
    categories: [],
  }),
})

// Fetch categories from API
const { data: categoriesData } = await useFetch<{
  groups: CategoryGroup[]
  total: number
}>('/api/categories')

const categoryGroups = computed(() => categoriesData.value?.groups || [])

// Time filter options
const timeOptions = [
  { value: 15, label: '15 min or less' },
  { value: 30, label: '30 min or less' },
  { value: 60, label: '1 hour or less' },
  { value: 120, label: '2 hours or less' },
]

// Servings filter options
const servingsOptions = [
  { min: 1, max: 2, label: '1-2 servings' },
  { min: 3, max: 4, label: '3-4 servings' },
  { min: 5, max: 8, label: '5-8 servings' },
  { min: 9, max: null, label: '9+ servings' },
]

function setTimeFilter(value: number | null): void {
  model.value = { ...model.value, maxTime: model.value.maxTime === value ? null : value }
}

function setServingsFilter(min: number | null, max: number | null): void {
  const isActive = model.value.minServings === min && model.value.maxServings === max
  model.value = {
    ...model.value,
    minServings: isActive ? null : min,
    maxServings: isActive ? null : max,
  }
}

function toggleCategory(slug: string): void {
  const current = [...model.value.categories]
  const index = current.indexOf(slug)
  if (index === -1) {
    current.push(slug)
  } else {
    current.splice(index, 1)
  }
  model.value = { ...model.value, categories: current }
}

function isCategorySelected(slug: string): boolean {
  return model.value.categories.includes(slug)
}

function getCategoryCountForGroup(group: CategoryGroup): number {
  return group.categories.filter(c => isCategorySelected(c.slug)).length
}

function clearAll(): void {
  model.value = {
    maxTime: null,
    minServings: null,
    maxServings: null,
    categories: [],
  }
}

const hasFilters = computed(() =>
  model.value.maxTime !== null ||
  model.value.minServings !== null ||
  model.value.maxServings !== null ||
  model.value.categories.length > 0
)

const totalCategoryCount = computed(() => model.value.categories.length)

// Collapsible sections - start with some categories expanded
const expandedSections = ref<Set<string>>(new Set(['time', 'servings', 'meal', 'dietary']))

function toggleSection(section: string): void {
  if (expandedSections.value.has(section)) {
    expandedSections.value.delete(section)
  } else {
    expandedSections.value.add(section)
  }
}
</script>

<template>
  <aside class="w-64 flex-shrink-0">
    <div class="sticky top-20 space-y-6 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <h3 class="font-display text-lg text-neutral-700 dark:text-neutral-100">
          Filters
        </h3>
        <UButton
          v-if="hasFilters"
          variant="ghost"
          color="neutral"
          size="xs"
          @click="clearAll"
        >
          Clear all
        </UButton>
      </div>

      <!-- Time Filter -->
      <div>
        <button
          type="button"
          class="flex items-center justify-between w-full text-left mb-3"
          @click="toggleSection('time')"
        >
          <div class="flex items-center gap-2">
            <UIcon
              name="i-heroicons-clock"
              class="w-4 h-4 text-primary-600 dark:text-primary-400"
            />
            <span class="font-medium text-neutral-700 dark:text-neutral-200">
              Cook Time
            </span>
          </div>
          <UIcon
            :name="expandedSections.has('time') ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
            class="w-4 h-4 text-neutral-400"
          />
        </button>

        <Transition
          enter-active-class="transition-all duration-200"
          leave-active-class="transition-all duration-200"
          enter-from-class="opacity-0 -translate-y-2"
          leave-to-class="opacity-0 -translate-y-2"
        >
          <div
            v-if="expandedSections.has('time')"
            class="space-y-2"
          >
            <button
              v-for="option in timeOptions"
              :key="option.value"
              type="button"
              class="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors"
              :class="[
                model.maxTime === option.value
                  ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
              ]"
              @click="setTimeFilter(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </Transition>
      </div>

      <!-- Servings Filter -->
      <div class="border-t border-neutral-200 dark:border-neutral-700 pt-4">
        <button
          type="button"
          class="flex items-center justify-between w-full text-left mb-3"
          @click="toggleSection('servings')"
        >
          <div class="flex items-center gap-2">
            <UIcon
              name="i-heroicons-users"
              class="w-4 h-4 text-primary-600 dark:text-primary-400"
            />
            <span class="font-medium text-neutral-700 dark:text-neutral-200">
              Servings
            </span>
          </div>
          <UIcon
            :name="expandedSections.has('servings') ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
            class="w-4 h-4 text-neutral-400"
          />
        </button>

        <Transition
          enter-active-class="transition-all duration-200"
          leave-active-class="transition-all duration-200"
          enter-from-class="opacity-0 -translate-y-2"
          leave-to-class="opacity-0 -translate-y-2"
        >
          <div
            v-if="expandedSections.has('servings')"
            class="space-y-2"
          >
            <button
              v-for="option in servingsOptions"
              :key="option.label"
              type="button"
              class="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors"
              :class="[
                model.minServings === option.min && model.maxServings === option.max
                  ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
              ]"
              @click="setServingsFilter(option.min, option.max)"
            >
              {{ option.label }}
            </button>
          </div>
        </Transition>
      </div>

      <!-- Categories Header -->
      <div
        v-if="categoryGroups.length > 0"
        class="border-t border-neutral-200 dark:border-neutral-700 pt-4"
      >
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <UIcon
              name="i-heroicons-tag"
              class="w-4 h-4 text-primary-600 dark:text-primary-400"
            />
            <span class="font-medium text-neutral-700 dark:text-neutral-200">
              Categories
            </span>
          </div>
          <span
            v-if="totalCategoryCount > 0"
            class="text-xs bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-full"
          >
            {{ totalCategoryCount }}
          </span>
        </div>

        <!-- Category Groups -->
        <div class="space-y-3">
          <div
            v-for="group in categoryGroups"
            :key="group.type"
          >
            <button
              type="button"
              class="flex items-center justify-between w-full text-left text-sm mb-2"
              @click="toggleSection(group.type)"
            >
              <span class="text-neutral-600 dark:text-neutral-300">
                {{ group.label }}
              </span>
              <div class="flex items-center gap-2">
                <span
                  v-if="getCategoryCountForGroup(group) > 0"
                  class="text-xs text-primary-600 dark:text-primary-400"
                >
                  {{ getCategoryCountForGroup(group) }}
                </span>
                <UIcon
                  :name="expandedSections.has(group.type) ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
                  class="w-3.5 h-3.5 text-neutral-400"
                />
              </div>
            </button>

            <Transition
              enter-active-class="transition-all duration-200"
              leave-active-class="transition-all duration-200"
              enter-from-class="opacity-0 -translate-y-2"
              leave-to-class="opacity-0 -translate-y-2"
            >
              <div
                v-if="expandedSections.has(group.type)"
                class="flex flex-wrap gap-1.5 pb-2"
              >
                <button
                  v-for="category in group.categories"
                  :key="category.id"
                  type="button"
                  class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all"
                  :class="[
                    isCategorySelected(category.slug)
                      ? 'bg-primary-500 text-white'
                      : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'
                  ]"
                  @click="toggleCategory(category.slug)"
                >
                  <UIcon
                    v-if="category.icon && category.icon.startsWith('i-')"
                    :name="category.icon"
                    class="w-3 h-3"
                  />
                  {{ category.name }}
                  <UIcon
                    v-if="isCategorySelected(category.slug)"
                    name="i-heroicons-check"
                    class="w-3 h-3"
                  />
                </button>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>
