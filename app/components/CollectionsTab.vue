<script setup lang="ts">
import type { DbCollection } from '~/types/database'

// Matches the CollectionCard prop interface
type Collection = DbCollection & { recipe_count: number }

const collectionService = useCollectionService()

const { data, status, refresh } = await useAsyncData('my-collections', async () => {
  const result = await collectionService.getMyCollections()
  if (result.error) {
    console.error('Failed to fetch collections:', result.error)
    return { collections: [] as Collection[] }
  }
  return { collections: result.data || [] }
})

const collections = computed(() => data.value?.collections || [])

// Delete handling
const collectionToDelete = ref<Collection | null>(null)
const deleting = ref(false)
const deleteModalOpen = computed({
  get: () => collectionToDelete.value !== null,
  set: (val: boolean) => {
    if (!val) collectionToDelete.value = null
  },
})

async function handleDelete(): Promise<void> {
  if (!collectionToDelete.value) return

  deleting.value = true
  try {
    const { error } = await collectionService.deleteCollection(collectionToDelete.value.id)
    if (error) {
      throw error
    }
    collectionToDelete.value = null
    refresh()
  } catch (err) {
    console.error('Failed to delete collection:', err)
  }
  deleting.value = false
}

function confirmDelete(collection: Collection): void {
  collectionToDelete.value = collection
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-display text-neutral-700 dark:text-neutral-50">
          My Cookbooks
        </h2>
        <p class="text-neutral-500 dark:text-neutral-400 mt-1">
          Organize your recipes into themed groups
        </p>
      </div>
      <UButton
        to="/collections/new"
        color="primary"
        icon="i-heroicons-plus"
        class="press-effect"
      >
        New Cookbook
      </UButton>
    </div>

    <!-- Stats bar -->
    <div
      v-if="collections.length > 0"
      class="flex items-center gap-6 mb-6 p-4 bg-neutral-100 dark:bg-neutral-800 rounded-xl"
    >
      <div class="flex items-center gap-2">
        <div class="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
          <UIcon
            name="i-heroicons-book-open"
            class="w-5 h-5 text-primary-600 dark:text-primary-400"
          />
        </div>
        <div>
          <p class="text-2xl font-semibold text-neutral-700 dark:text-neutral-100">
            {{ collections.length }}
          </p>
          <p class="text-xs text-neutral-500 dark:text-neutral-400">
            {{ collections.length === 1 ? 'Cookbook' : 'Cookbooks' }}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-10 h-10 rounded-lg bg-sage-100 dark:bg-sage-900/30 flex items-center justify-center">
          <UIcon
            name="i-heroicons-book-open"
            class="w-5 h-5 text-sage-600 dark:text-sage-400"
          />
        </div>
        <div>
          <p class="text-2xl font-semibold text-neutral-700 dark:text-neutral-100">
            {{ collections.reduce((sum, c) => sum + c.recipe_count, 0) }}
          </p>
          <p class="text-xs text-neutral-500 dark:text-neutral-400">
            Total Recipes
          </p>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div
      v-if="status === 'pending'"
      class="grid grid-cols-1 sm:grid-cols-2 gap-4"
    >
      <div
        v-for="i in 4"
        :key="i"
        class="h-52 rounded-xl animate-shimmer"
      />
    </div>

    <!-- Empty State -->
    <EmptyState
      v-else-if="collections.length === 0"
      type="collections"
      title="No cookbooks yet"
      description="Create a cookbook to organize your favorite recipes by theme, occasion, or cuisine."
      action-label="Create Your First Cookbook"
      action-to="/collections/new"
    />

    <!-- Collections Grid -->
    <div
      v-else
      class="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-stagger"
    >
      <CollectionsCollectionCard
        v-for="collection in collections"
        :key="collection.id"
        :collection="collection"
        @delete="confirmDelete(collection)"
      />
    </div>

    <!-- Delete Modal -->
    <UModal
      v-model:open="deleteModalOpen"
      title="Delete Cookbook"
      description="Confirm deletion of cookbook"
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
                Delete Cookbook
              </h3>
            </div>
          </template>
          <p class="text-neutral-600 dark:text-neutral-300">
            Are you sure you want to delete "<strong>{{ collectionToDelete?.name }}</strong>"?
          </p>
          <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
            This won't delete the recipes themselves, just the cookbook.
          </p>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton
                color="neutral"
                variant="outline"
                @click="collectionToDelete = null"
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
                Delete Cookbook
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
