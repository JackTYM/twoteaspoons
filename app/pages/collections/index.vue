<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

useSeoMeta({
  title: 'My Collections',
  description: 'Your recipe collections',
})

interface Collection {
  id: number
  name: string
  description: string | null
  isPublic: boolean
  coverPhoto: string | null
  createdAt: string
  recipeCount: number
}

const { data, status, refresh } = await useFetch<{ collections: Collection[] }>('/api/collections')

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
    await $fetch(`/api/collections/${collectionToDelete.value.id}`, { method: 'DELETE' })
    collectionToDelete.value = null
    refresh()
  } catch (err) {
    console.error('Failed to delete collection:', err)
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
          My Collections
        </h1>
        <p class="text-neutral-500 dark:text-neutral-400 mt-1">
          {{ collections.length }} collection{{ collections.length === 1 ? '' : 's' }}
        </p>
      </div>
      <UButton
        to="/collections/new"
        color="primary"
        icon="i-heroicons-plus"
      >
        New Collection
      </UButton>
    </div>

    <!-- Loading -->
    <div
      v-if="status === 'pending'"
      class="grid grid-cols-1 sm:grid-cols-2 gap-4"
    >
      <USkeleton
        v-for="i in 4"
        :key="i"
        class="h-40 rounded-lg"
      />
    </div>

    <!-- Empty State -->
    <div
      v-else-if="collections.length === 0"
      class="text-center py-16"
    >
      <div class="p-4 rounded-full bg-neutral-100 dark:bg-neutral-800 inline-block mb-4">
        <UIcon
          name="i-heroicons-folder"
          class="w-12 h-12 text-neutral-400"
        />
      </div>
      <h2 class="text-xl font-semibold text-neutral-700 dark:text-neutral-100 mb-2">
        No collections yet
      </h2>
      <p class="text-neutral-500 dark:text-neutral-400 mb-6">
        Create a collection to organize your favorite recipes.
      </p>
      <UButton
        to="/collections/new"
        color="primary"
        icon="i-heroicons-plus"
      >
        Create Your First Collection
      </UButton>
    </div>

    <!-- Collections Grid -->
    <div
      v-else
      class="grid grid-cols-1 sm:grid-cols-2 gap-4"
    >
      <NuxtLink
        v-for="collection in collections"
        :key="collection.id"
        :to="`/collections/${collection.id}`"
        class="block group"
      >
        <UCard class="h-full bg-neutral-50 dark:bg-neutral-800 hover:shadow-md transition-shadow overflow-hidden">
          <!-- Cover Image -->
          <template #header>
            <div class="h-24 -m-4 mb-0 relative overflow-hidden">
              <img
                v-if="collection.coverPhoto"
                :src="collection.coverPhoto"
                :alt="collection.name"
                class="w-full h-full object-cover"
              >
              <div
                v-else
                class="w-full h-full bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 flex items-center justify-center"
              >
                <UIcon
                  name="i-heroicons-folder"
                  class="w-10 h-10 text-primary-400"
                />
              </div>
              <!-- Visibility Badge -->
              <div class="absolute top-2 right-2">
                <UBadge
                  :color="collection.isPublic ? 'success' : 'neutral'"
                  variant="solid"
                  size="xs"
                >
                  {{ collection.isPublic ? 'Public' : 'Private' }}
                </UBadge>
              </div>
            </div>
          </template>

          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-neutral-700 dark:text-neutral-100 truncate">
                {{ collection.name }}
              </h3>
              <p
                v-if="collection.description"
                class="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-1"
              >
                {{ collection.description }}
              </p>
              <p class="text-sm text-neutral-400 dark:text-neutral-500 mt-2">
                {{ collection.recipeCount }} recipe{{ collection.recipeCount === 1 ? '' : 's' }}
              </p>
            </div>
            <UButton
              color="error"
              variant="ghost"
              icon="i-heroicons-trash"
              size="sm"
              class="opacity-0 group-hover:opacity-100 transition-opacity"
              @click.prevent="collectionToDelete = collection"
            />
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
              Delete Collection
            </h3>
          </template>
          <p class="text-neutral-500 dark:text-neutral-400">
            Are you sure you want to delete "{{ collectionToDelete?.name }}"? This won't delete the recipes in it.
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
