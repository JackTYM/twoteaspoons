<script setup lang="ts">
interface ShoppingList {
  id: number
  name: string
  slug: string
  createdAt: string
  itemCount: number
  checkedCount: number
}

const shoppingListService = useShoppingListService()

const { data, status, refresh } = await useAsyncData('my-shopping-lists', async () => {
  try {
    const lists = await shoppingListService.getShoppingLists()
    // Transform snake_case to camelCase for compatibility with existing template
    const transformedLists: ShoppingList[] = lists.map(l => ({
      id: l.id,
      name: l.name,
      slug: l.slug,
      createdAt: l.created_at,
      itemCount: l.total_count,
      checkedCount: l.checked_count,
    }))
    return { lists: transformedLists }
  } catch (error) {
    console.error('Failed to fetch shopping lists:', error)
    return { lists: [] as ShoppingList[] }
  }
})

const lists = computed(() => data.value?.lists || [])

// Calculate stats
const totalLists = computed(() => lists.value.length)
const completedLists = computed(() => lists.value.filter(l => l.itemCount > 0 && l.checkedCount === l.itemCount).length)
const totalItems = computed(() => lists.value.reduce((sum, l) => sum + l.itemCount, 0))

// Delete handling
const listToDelete = ref<ShoppingList | null>(null)
const deleting = ref(false)
const deleteModalOpen = computed({
  get: () => listToDelete.value !== null,
  set: (val: boolean) => {
    if (!val) listToDelete.value = null
  },
})

async function handleDelete(): Promise<void> {
  if (!listToDelete.value) return

  deleting.value = true
  try {
    await shoppingListService.deleteShoppingList(listToDelete.value.id)
    listToDelete.value = null
    refresh()
  } catch (err) {
    console.error('Failed to delete list:', err)
  }
  deleting.value = false
}

function confirmDelete(list: ShoppingList): void {
  listToDelete.value = list
}

function getProgress(list: ShoppingList): number {
  if (list.itemCount === 0) return 0
  return Math.round((list.checkedCount / list.itemCount) * 100)
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString()
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-display text-neutral-700 dark:text-neutral-100">
        Shopping Lists
      </h2>
      <UButton
        to="/shopping/new"
        color="primary"
        icon="i-heroicons-plus"
        class="press-effect"
      >
        New List
      </UButton>
    </div>

    <!-- Stats bar -->
    <div
      v-if="lists.length > 0"
      class="flex items-center gap-6 mb-6 p-4 bg-neutral-100 dark:bg-neutral-800 rounded-xl"
    >
      <div class="flex items-center gap-2">
        <div class="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
          <UIcon
            name="i-heroicons-clipboard-document-list"
            class="w-5 h-5 text-primary-600 dark:text-primary-400"
          />
        </div>
        <div>
          <p class="text-2xl font-semibold text-neutral-700 dark:text-neutral-100">
            {{ totalLists }}
          </p>
          <p class="text-xs text-neutral-500 dark:text-neutral-400">
            {{ totalLists === 1 ? 'List' : 'Lists' }}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-10 h-10 rounded-lg bg-sage-100 dark:bg-sage-900/30 flex items-center justify-center">
          <UIcon
            name="i-heroicons-check-circle"
            class="w-5 h-5 text-sage-600 dark:text-sage-400"
          />
        </div>
        <div>
          <p class="text-2xl font-semibold text-neutral-700 dark:text-neutral-100">
            {{ completedLists }}
          </p>
          <p class="text-xs text-neutral-500 dark:text-neutral-400">
            Completed
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-10 h-10 rounded-lg bg-butter-100 dark:bg-butter-900/30 flex items-center justify-center">
          <UIcon
            name="i-heroicons-shopping-bag"
            class="w-5 h-5 text-butter-600 dark:text-butter-400"
          />
        </div>
        <div>
          <p class="text-2xl font-semibold text-neutral-700 dark:text-neutral-100">
            {{ totalItems }}
          </p>
          <p class="text-xs text-neutral-500 dark:text-neutral-400">
            Total Items
          </p>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div
      v-if="status === 'pending'"
      class="space-y-4"
    >
      <div
        v-for="i in 3"
        :key="i"
        class="h-24 rounded-xl animate-shimmer"
      />
    </div>

    <!-- Empty State -->
    <EmptyState
      v-else-if="lists.length === 0"
      type="shopping"
      title="No shopping lists yet"
      description="Create a shopping list from your recipes to make grocery shopping a breeze."
      action-label="Create Your First List"
      action-to="/shopping/new"
    />

    <!-- Lists -->
    <div
      v-else
      class="space-y-4"
    >
      <NuxtLink
        v-for="list in lists"
        :key="list.id"
        :to="`/shopping/${list.id}`"
        class="block group"
      >
        <div class="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700 hover:border-primary-400 dark:hover:border-primary-600 transition-all hover-lift">
          <div class="flex items-center gap-4">
            <!-- Progress Circle -->
            <div class="relative w-14 h-14 flex-shrink-0">
              <svg class="w-14 h-14 -rotate-90">
                <circle
                  cx="28"
                  cy="28"
                  r="24"
                  stroke="currentColor"
                  stroke-width="4"
                  fill="none"
                  class="text-neutral-200 dark:text-neutral-700"
                />
                <circle
                  cx="28"
                  cy="28"
                  r="24"
                  stroke="currentColor"
                  stroke-width="4"
                  fill="none"
                  stroke-linecap="round"
                  :stroke-dasharray="150.8"
                  :stroke-dashoffset="150.8 - (150.8 * getProgress(list)) / 100"
                  class="text-primary-500 transition-all duration-300"
                />
              </svg>
              <span class="absolute inset-0 flex items-center justify-center text-sm font-semibold text-neutral-700 dark:text-neutral-100">
                {{ getProgress(list) }}%
              </span>
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-neutral-700 dark:text-neutral-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                {{ list.name }}
              </h3>
              <p class="text-sm text-neutral-500 dark:text-neutral-400">
                {{ list.checkedCount }} of {{ list.itemCount }} items
              </p>
              <p class="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                {{ formatDate(list.createdAt) }}
              </p>
            </div>

            <!-- Delete Button -->
            <UButton
              icon="i-heroicons-trash"
              color="error"
              variant="ghost"
              size="sm"
              class="opacity-0 group-hover:opacity-100 transition-opacity"
              @click.prevent="confirmDelete(list)"
            />
          </div>
        </div>
      </NuxtLink>
    </div>

    <!-- Delete Modal -->
    <UModal
      v-model:open="deleteModalOpen"
      title="Delete Shopping List"
      description="Confirm deletion of shopping list"
    >
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-error-100 dark:bg-error-900/30 flex items-center justify-center">
                <UIcon
                  name="i-heroicons-trash"
                  class="w-5 h-5 text-error-600 dark:text-error-400"
                />
              </div>
              <h3 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">
                Delete Shopping List
              </h3>
            </div>
          </template>
          <p class="text-neutral-600 dark:text-neutral-300">
            Are you sure you want to delete "<strong>{{ listToDelete?.name }}</strong>"?
          </p>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton
                color="neutral"
                variant="outline"
                @click="listToDelete = null"
              >
                Cancel
              </UButton>
              <UButton
                color="error"
                variant="solid"
                :loading="deleting"
                class="press-effect"
                @click="handleDelete"
              >
                Delete
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
