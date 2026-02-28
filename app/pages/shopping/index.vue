<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

useSeoMeta({
  title: 'Shopping Lists',
  description: 'Your shopping lists',
})

interface ShoppingList {
  id: number
  name: string
  createdAt: string
  itemCount: number
  checkedCount: number
}

const { data, status, refresh } = await useFetch<{ lists: ShoppingList[] }>('/api/shopping-lists')

const lists = computed(() => data.value?.lists || [])

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

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
    await $fetch(`/api/shopping-lists/${listToDelete.value.id}`, { method: 'DELETE' })
    listToDelete.value = null
    refresh()
  } catch (err) {
    console.error('Failed to delete list:', err)
  }
  deleting.value = false
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-3xl font-bold text-neutral-700 dark:text-neutral-50">
          Shopping Lists
        </h1>
        <p class="text-neutral-500 dark:text-neutral-400 mt-1">
          {{ lists.length }} list{{ lists.length === 1 ? '' : 's' }}
        </p>
      </div>
      <UButton
        to="/shopping/new"
        color="primary"
        icon="i-heroicons-plus"
      >
        New List
      </UButton>
    </div>

    <!-- Loading -->
    <div
      v-if="status === 'pending'"
      class="space-y-4"
    >
      <USkeleton
        v-for="i in 3"
        :key="i"
        class="h-20 rounded-lg"
      />
    </div>

    <!-- Empty State -->
    <div
      v-else-if="lists.length === 0"
      class="text-center py-16"
    >
      <div class="p-4 rounded-full bg-neutral-100 dark:bg-neutral-800 inline-block mb-4">
        <UIcon
          name="i-heroicons-shopping-cart"
          class="w-12 h-12 text-neutral-400"
        />
      </div>
      <h2 class="text-xl font-semibold text-neutral-700 dark:text-neutral-100 mb-2">
        No shopping lists yet
      </h2>
      <p class="text-neutral-500 dark:text-neutral-400 mb-6">
        Create a list from your recipes to get started.
      </p>
      <UButton
        to="/shopping/new"
        color="primary"
        icon="i-heroicons-plus"
      >
        Create Your First List
      </UButton>
    </div>

    <!-- Lists -->
    <div
      v-else
      class="space-y-4"
    >
      <NuxtLink
        v-for="list in lists"
        :key="list.id"
        :to="`/shopping/${list.id}`"
        class="block"
      >
        <UCard class="bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:shadow-md transition-shadow">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-semibold text-neutral-700 dark:text-neutral-100">
                {{ list.name }}
              </h3>
              <div class="flex items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                <span>{{ formatDate(list.createdAt) }}</span>
                <span>{{ list.checkedCount }}/{{ list.itemCount }} items</span>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <!-- Progress -->
              <div class="w-24 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div
                  class="h-full bg-success-500 transition-all"
                  :style="{ width: list.itemCount > 0 ? `${(list.checkedCount / list.itemCount) * 100}%` : '0%' }"
                />
              </div>

              <UButton
                color="error"
                variant="ghost"
                icon="i-heroicons-trash"
                size="sm"
                @click.prevent="listToDelete = list"
              />
            </div>
          </div>
        </UCard>
      </NuxtLink>
    </div>

    <!-- Delete Modal -->
    <UModal v-model:open="deleteModalOpen">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">
              Delete Shopping List
            </h3>
          </template>
          <p class="text-neutral-500 dark:text-neutral-400">
            Are you sure you want to delete "{{ listToDelete?.name }}"?
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
                :loading="deleting"
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
