<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

useSeoMeta({
  title: 'My Collections',
  description: 'Your recipe collections',
})

const { getAuthHeaders } = useAuth()

interface Collection {
  id: number
  name: string
  slug: string
  description: string | null
  isPublic: boolean
  coverPhoto: string | null
  createdAt: string
  recipeCount: number
  previewPhotos?: string[]
}

const { data, status, refresh } = await useFetch<{ collections: Collection[] }>('/api/collections', {
  headers: getAuthHeaders(),
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
    await $fetch(`/api/collections/by-id/${collectionToDelete.value.slug}`, { method: 'DELETE', headers: getAuthHeaders() })
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
  <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-3xl font-display text-neutral-700 dark:text-neutral-50">
          My Collections
        </h1>
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
        New Collection
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
            name="i-heroicons-folder"
            class="w-5 h-5 text-primary-600 dark:text-primary-400"
          />
        </div>
        <div>
          <p class="text-2xl font-semibold text-neutral-700 dark:text-neutral-100">
            {{ collections.length }}
          </p>
          <p class="text-xs text-neutral-500 dark:text-neutral-400">
            {{ collections.length === 1 ? 'Collection' : 'Collections' }}
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
            {{ collections.reduce((sum, c) => sum + c.recipeCount, 0) }}
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
      title="No collections yet"
      description="Create a collection to organize your favorite recipes by theme, occasion, or cuisine."
      action-label="Create Your First Collection"
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
      title="Delete Collection"
      description="Confirm deletion of collection"
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
                Delete Collection
              </h3>
            </div>
          </template>
          <p class="text-neutral-600 dark:text-neutral-300">
            Are you sure you want to delete "<strong>{{ collectionToDelete?.name }}</strong>"?
          </p>
          <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
            This won't delete the recipes themselves, just the collection.
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
                Delete Collection
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
