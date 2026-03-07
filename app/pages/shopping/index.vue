<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

useSeoMeta({
  title: 'Shopping Lists',
  description: 'Your shopping lists',
})

const { getAuthHeaders } = useAuth()

interface ShoppingList {
  id: number
  name: string
  slug: string
  createdAt: string
  itemCount: number
  checkedCount: number
}

const { data, status, refresh } = await useFetch<{ lists: ShoppingList[] }>('/api/shopping-lists', {
  headers: getAuthHeaders(),
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
    await $fetch(`/api/shopping-lists/${listToDelete.value.slug}`, { method: 'DELETE', headers: getAuthHeaders() })
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
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-3xl font-display text-neutral-700 dark:text-neutral-50">
          Shopping Lists
        </h1>
        <p class="text-neutral-500 dark:text-neutral-400 mt-1">
          Your shopping lists from recipes
        </p>
      </div>
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
      description="Create a list from your recipes to make grocery shopping easier."
      action-label="Create Your First List"
      action-to="/shopping/new"
    />

    <!-- Lists -->
    <div
      v-else
      class="space-y-3 animate-stagger"
    >
      <ShoppingListCard
        v-for="list in lists"
        :key="list.id"
        :list="list"
        @delete="confirmDelete(list)"
      />
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
          <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
            This action cannot be undone.
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
                Delete List
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
