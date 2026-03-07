<script setup lang="ts">
interface Collection {
  id: number
  name: string
  slug: string
  coverPhoto: string | null
  recipeCount: number
}

interface Props {
  recipeId: number | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  added: [collectionId: number]
}>()

const open = defineModel<boolean>('open', { default: false })

const { getAuthHeaders } = useAuth()

// Fetch user's collections - lazy to avoid SSR hydration issues
const { data: collectionsData, status, refresh: refreshCollections } = useLazyFetch<{ collections: Collection[] }>('/api/collections', {
  headers: getAuthHeaders(),
  immediate: false,
})

const collections = computed(() => collectionsData.value?.collections ?? [])

// Check which collections already have this recipe
const { data: recipeCollectionsData, refresh: refreshRecipeCollections } = useLazyFetch<{ collectionIds: number[] }>(
  () => props.recipeId ? `/api/recipes/by-id/${props.recipeId}/collections` : '',
  {
    headers: getAuthHeaders(),
    immediate: false,
  }
)

const recipeCollectionIds = computed(() => recipeCollectionsData.value?.collectionIds ?? [])

// Fetch data when modal opens
watch([open, () => props.recipeId], ([isOpen, recipeId]): void => {
  if (isOpen) {
    refreshCollections()
    if (recipeId) {
      refreshRecipeCollections()
    }
  }
})

function isInCollection(collectionId: number): boolean {
  return recipeCollectionIds.value.includes(collectionId)
}

// Adding state
const adding = ref<number | null>(null)

async function addToCollection(collectionId: number): Promise<void> {
  if (!props.recipeId || isInCollection(collectionId)) return

  adding.value = collectionId
  try {
    await $fetch(`/api/collections/by-id/${collectionId}/recipes`, {
      method: 'POST',
      body: { recipeId: props.recipeId },
      headers: getAuthHeaders(),
    })
    // Update local state optimistically
    if (recipeCollectionsData.value) {
      recipeCollectionsData.value.collectionIds.push(collectionId)
    }
    emit('added', collectionId)
  } catch (err) {
    console.error('Failed to add to collection:', err)
  }
  adding.value = null
}

function handleCreateNew(): void {
  if (props.recipeId) {
    navigateTo(`/collections/new?recipeId=${props.recipeId}`)
  } else {
    navigateTo('/collections/new')
  }
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Add to Collection"
    description="Choose a collection to add this recipe to"
  >
    <template #content>
      <div class="p-6 max-h-[70vh] flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-display text-neutral-700 dark:text-neutral-100">
            Add to Collection
          </h3>
          <UButton
            icon="i-heroicons-x-mark"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="open = false"
          />
        </div>

        <!-- Collection List -->
        <div class="flex-1 overflow-y-auto -mx-2 px-2 space-y-2">
          <!-- Loading -->
          <div
            v-if="status === 'pending'"
            class="space-y-3"
          >
            <div
              v-for="i in 4"
              :key="i"
              class="h-16 rounded-lg animate-shimmer"
            />
          </div>

          <!-- Empty State -->
          <div
            v-else-if="collections.length === 0"
            class="text-center py-8"
          >
            <div class="w-14 h-14 mx-auto mb-3 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
              <UIcon
                name="i-heroicons-folder"
                class="w-7 h-7 text-neutral-400"
              />
            </div>
            <p class="text-neutral-600 dark:text-neutral-300 mb-1">
              No collections yet
            </p>
            <p class="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
              Create your first collection to organize recipes
            </p>
          </div>

          <!-- Collections -->
          <template v-else>
            <button
              v-for="collection in collections"
              :key="collection.id"
              type="button"
              class="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left"
              :class="[
                isInCollection(collection.id)
                  ? 'bg-sage-50 dark:bg-sage-900/20 cursor-default'
                  : 'bg-neutral-50 dark:bg-neutral-800 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:ring-2 hover:ring-primary-400 press-effect'
              ]"
              :disabled="isInCollection(collection.id) || adding !== null"
              @click="addToCollection(collection.id)"
            >
              <!-- Collection Cover -->
              <div class="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-200 dark:bg-neutral-700">
                <img
                  v-if="collection.coverPhoto"
                  :src="collection.coverPhoto"
                  :alt="collection.name"
                  class="w-full h-full object-cover"
                >
                <div
                  v-else
                  class="w-full h-full flex items-center justify-center"
                >
                  <UIcon
                    name="i-heroicons-folder"
                    class="w-5 h-5 text-neutral-400"
                  />
                </div>
              </div>

              <!-- Collection Info -->
              <div class="flex-1 min-w-0">
                <p class="font-medium text-neutral-700 dark:text-neutral-100 truncate">
                  {{ collection.name }}
                </p>
                <p class="text-sm text-neutral-500 dark:text-neutral-400">
                  {{ collection.recipeCount }} {{ collection.recipeCount === 1 ? 'recipe' : 'recipes' }}
                </p>
              </div>

              <!-- Status Icon -->
              <div class="flex-shrink-0">
                <UIcon
                  v-if="adding === collection.id"
                  name="i-heroicons-arrow-path"
                  class="w-5 h-5 text-primary-500 animate-spin"
                />
                <div
                  v-else-if="isInCollection(collection.id)"
                  class="flex items-center gap-1 text-sage-600 dark:text-sage-400"
                >
                  <UIcon
                    name="i-heroicons-check-circle"
                    class="w-5 h-5"
                  />
                  <span class="text-xs">Added</span>
                </div>
                <UIcon
                  v-else
                  name="i-heroicons-plus-circle"
                  class="w-5 h-5 text-neutral-400 group-hover:text-primary-500"
                />
              </div>
            </button>
          </template>
        </div>

        <!-- Create New Collection Button -->
        <div class="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <UButton
            color="primary"
            variant="soft"
            block
            icon="i-heroicons-plus"
            class="press-effect"
            @click="handleCreateNew"
          >
            Create New Collection
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
