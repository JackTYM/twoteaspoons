<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

const route = useRoute()
const listId = computed(() => Number(route.params.id))

interface ShoppingItem {
  id: number
  item: string
  amount: number | null
  unit: string | null
  section: string
  checked: boolean
}

interface Section {
  name: string
  items: ShoppingItem[]
}

interface ShoppingListData {
  list: {
    id: number
    name: string
    createdAt: string
  }
  sections: Section[]
  totalItems: number
  checkedItems: number
}

const { data, status, refresh } = await useFetch<ShoppingListData>(`/api/shopping-lists/${listId.value}`)

useSeoMeta({
  title: computed(() => data.value?.list.name || 'Shopping List'),
  description: 'Your shopping list',
})

const sectionLabels: Record<string, string> = {
  produce: 'Produce',
  dairy: 'Dairy & Eggs',
  meat: 'Meat & Poultry',
  seafood: 'Seafood',
  bakery: 'Bakery',
  frozen: 'Frozen',
  pantry: 'Pantry',
  beverages: 'Beverages',
  other: 'Other',
}

const sectionIcons: Record<string, string> = {
  produce: 'i-heroicons-leaf',
  dairy: 'i-heroicons-beaker',
  meat: 'i-heroicons-fire',
  seafood: 'i-heroicons-sparkles',
  bakery: 'i-heroicons-cake',
  frozen: 'i-heroicons-snowflake',
  pantry: 'i-heroicons-cube',
  beverages: 'i-heroicons-beaker',
  other: 'i-heroicons-shopping-bag',
}

const toggling = ref<Set<number>>(new Set())

async function toggleItem(item: ShoppingItem): Promise<void> {
  if (toggling.value.has(item.id)) return

  toggling.value.add(item.id)

  // Optimistic update
  item.checked = !item.checked

  try {
    await $fetch(`/api/shopping-lists/${listId.value}/items/${item.id}`, {
      method: 'PATCH',
      body: { checked: item.checked },
    })
    refresh()
  } catch (err) {
    // Revert on error
    item.checked = !item.checked
    console.error('Failed to toggle item:', err)
  }

  toggling.value.delete(item.id)
}

function formatAmount(item: ShoppingItem): string {
  if (!item.amount) return ''
  const amount = item.amount % 1 === 0 ? item.amount.toString() : item.amount.toFixed(2).replace(/\.?0+$/, '')
  return item.unit ? `${amount} ${item.unit}` : amount
}

const progress = computed(() => {
  if (!data.value || data.value.totalItems === 0) return 0
  return Math.round((data.value.checkedItems / data.value.totalItems) * 100)
})

const allChecked = computed(() => {
  return data.value && data.value.checkedItems === data.value.totalItems && data.value.totalItems > 0
})
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 sm:px-6 py-8">
    <!-- Loading -->
    <div
      v-if="status === 'pending'"
      class="space-y-4"
    >
      <USkeleton class="h-10 w-48" />
      <USkeleton class="h-4 w-32" />
      <USkeleton class="h-24 rounded-lg" />
      <USkeleton class="h-24 rounded-lg" />
    </div>

    <!-- Error -->
    <div
      v-else-if="!data"
      class="text-center py-16"
    >
      <UIcon
        name="i-heroicons-exclamation-triangle"
        class="w-12 h-12 text-error-500 mx-auto mb-4"
      />
      <h2 class="text-xl font-semibold text-neutral-700 dark:text-neutral-100 mb-2">
        List Not Found
      </h2>
      <p class="text-neutral-500 dark:text-neutral-400 mb-6">
        This shopping list doesn't exist or you don't have access.
      </p>
      <UButton
        to="/shopping"
        color="primary"
      >
        Back to Lists
      </UButton>
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Header -->
      <div class="mb-6">
        <NuxtLink
          to="/shopping"
          class="text-sm text-neutral-500 dark:text-neutral-400 hover:text-primary-500 mb-2 inline-flex items-center gap-1"
        >
          <UIcon name="i-heroicons-arrow-left" />
          Back to Lists
        </NuxtLink>
        <h1 class="text-3xl font-bold text-neutral-700 dark:text-neutral-50">
          {{ data.list.name }}
        </h1>
      </div>

      <!-- Progress -->
      <UCard class="mb-6 bg-neutral-50 dark:bg-neutral-800">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm text-neutral-500 dark:text-neutral-400">
            {{ data.checkedItems }} of {{ data.totalItems }} items
          </span>
          <span class="text-sm font-medium text-neutral-700 dark:text-neutral-100">
            {{ progress }}%
          </span>
        </div>
        <div class="w-full h-3 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
          <div
            class="h-full bg-success-500 transition-all duration-300"
            :style="{ width: `${progress}%` }"
          />
        </div>

        <!-- Completed Message -->
        <div
          v-if="allChecked"
          class="mt-4 p-3 bg-success-100 dark:bg-success-900/30 rounded-lg flex items-center gap-2"
        >
          <UIcon
            name="i-heroicons-check-circle-solid"
            class="w-5 h-5 text-success-600 dark:text-success-400"
          />
          <span class="text-success-700 dark:text-success-300 font-medium">
            Shopping complete!
          </span>
        </div>
      </UCard>

      <!-- Sections -->
      <div class="space-y-6">
        <div
          v-for="section in data.sections"
          :key="section.name"
        >
          <div class="flex items-center gap-2 mb-3">
            <UIcon
              :name="sectionIcons[section.name] || 'i-heroicons-shopping-bag'"
              class="w-5 h-5 text-neutral-500 dark:text-neutral-400"
            />
            <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">
              {{ sectionLabels[section.name] || section.name }}
            </h2>
            <span class="text-sm text-neutral-400 dark:text-neutral-500">
              ({{ section.items.filter(i => i.checked).length }}/{{ section.items.length }})
            </span>
          </div>

          <div class="space-y-2">
            <div
              v-for="item in section.items"
              :key="item.id"
              class="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors"
              :class="[
                item.checked
                  ? 'bg-neutral-100 dark:bg-neutral-800/50'
                  : 'bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700'
              ]"
              @click="toggleItem(item)"
            >
              <div
                class="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                :class="[
                  item.checked
                    ? 'bg-success-500 border-success-500'
                    : 'border-neutral-300 dark:border-neutral-600'
                ]"
              >
                <UIcon
                  v-if="item.checked"
                  name="i-heroicons-check"
                  class="w-4 h-4 text-white"
                />
              </div>

              <div class="flex-1 min-w-0">
                <span
                  class="block transition-all"
                  :class="[
                    item.checked
                      ? 'line-through text-neutral-400 dark:text-neutral-500'
                      : 'text-neutral-700 dark:text-neutral-100'
                  ]"
                >
                  {{ item.item }}
                </span>
              </div>

              <span
                v-if="item.amount"
                class="text-sm flex-shrink-0"
                :class="[
                  item.checked
                    ? 'text-neutral-400 dark:text-neutral-500'
                    : 'text-neutral-500 dark:text-neutral-400'
                ]"
              >
                {{ formatAmount(item) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-if="data.sections.length === 0"
        class="text-center py-12"
      >
        <UIcon
          name="i-heroicons-shopping-bag"
          class="w-12 h-12 text-neutral-400 mx-auto mb-4"
        />
        <p class="text-neutral-500 dark:text-neutral-400">
          This list is empty.
        </p>
      </div>
    </template>
  </div>
</template>
