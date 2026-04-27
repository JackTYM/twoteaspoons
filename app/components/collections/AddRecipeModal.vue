<script setup lang="ts">
import { useRecipeService } from '~/services/recipeService'
import { useCollectionService } from '~/services/collectionService'

interface Recipe {
  id: number
  title: string
  coverPhoto: string | null
}

interface Props {
  collectionId?: number
  collectionSlug?: string
  existingRecipeIds: number[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  added: [recipeIds?: number[]]
}>()

const open = defineModel<boolean>('open', { default: false })

const recipeService = useRecipeService()
const collectionService = useCollectionService()

// Search and recipes
const search = ref('')
const selectedIds = ref<Set<number>>(new Set())

// Fetch user's recipes using service
const recipesStatus = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
const allRecipes = ref<Recipe[]>([])

// Load recipes on mount
onMounted(async () => {
  recipesStatus.value = 'pending'
  try {
    const recipes = await recipeService.getMyRecipes()
    allRecipes.value = recipes.map(r => ({
      id: r.id,
      title: r.title,
      coverPhoto: r.cover_photo,
    }))
    recipesStatus.value = 'success'
  } catch (err) {
    console.error('Failed to fetch recipes:', err)
    recipesStatus.value = 'error'
  }
})

const filteredRecipes = computed(() => {
  if (!search.value.trim()) return allRecipes.value
  const query = search.value.toLowerCase()
  return allRecipes.value.filter(r => r.title.toLowerCase().includes(query))
})

function isInCollection(recipeId: number): boolean {
  return props.existingRecipeIds.includes(recipeId)
}

function isSelected(recipeId: number): boolean {
  return selectedIds.value.has(recipeId)
}

function toggleRecipe(recipeId: number): void {
  if (isInCollection(recipeId)) return

  const newSet = new Set(selectedIds.value)
  if (newSet.has(recipeId)) {
    newSet.delete(recipeId)
  } else {
    newSet.add(recipeId)
  }
  selectedIds.value = newSet
}

// Adding state
const adding = ref(false)
const addProgress = ref(0)
const addedCount = ref(0)

async function addSelected(): Promise<void> {
  if (selectedIds.value.size === 0) return

  adding.value = true
  addProgress.value = 0
  addedCount.value = 0

  try {
    const recipeIds = Array.from(selectedIds.value)

    // If no collection ID (create mode), just emit the IDs without API call
    if (!props.collectionId) {
      selectedIds.value = new Set()
      open.value = false
      emit('added', recipeIds)
      adding.value = false
      return
    }

    // Add recipes one at a time for progress feedback
    // collectionId is guaranteed to be defined here due to the early return above
    const collectionId = props.collectionId as number
    const total = recipeIds.length
    for (const recipeId of recipeIds) {
      const { error } = await collectionService.addRecipeToCollection(collectionId, recipeId)
      if (error) throw error
      addedCount.value++
      addProgress.value = (addedCount.value / total) * 100
    }

    selectedIds.value = new Set()
    open.value = false
    emit('added', recipeIds)
  } catch (err) {
    console.error('Failed to add recipes:', err)
  }
  adding.value = false
  addProgress.value = 0
  addedCount.value = 0
}

// Reset selection when modal closes
watch(open, (isOpen) => {
  if (!isOpen) {
    selectedIds.value = new Set()
    search.value = ''
  }
})
</script>

<template>
  <USlideover
    v-model:open="open"
    side="right"
  >
    <template #content>
      <div class="flex flex-col h-full bg-neutral-50 dark:bg-neutral-900">
        <!-- Header -->
        <div class="p-4 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-lg font-display text-neutral-700 dark:text-neutral-100">
              Add Recipes
            </h3>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-x-mark"
              size="sm"
              @click="open = false"
            />
          </div>
          <UInput
            v-model="search"
            placeholder="Search your recipes..."
            icon="i-heroicons-magnifying-glass"
            size="lg"
          />
        </div>

        <!-- Recipe list -->
        <div class="flex-1 overflow-y-auto p-4">
          <div
            v-if="recipesStatus === 'pending'"
            class="space-y-3"
          >
            <div
              v-for="i in 6"
              :key="i"
              class="h-16 rounded-lg animate-shimmer"
            />
          </div>

          <div
            v-else-if="filteredRecipes.length === 0"
            class="text-center py-12"
          >
            <UIcon
              name="i-heroicons-magnifying-glass"
              class="w-10 h-10 text-neutral-400 mx-auto mb-3"
            />
            <p class="text-neutral-500 dark:text-neutral-400">
              No recipes found
            </p>
          </div>

          <div
            v-else
            class="space-y-2"
          >
            <button
              v-for="recipe in filteredRecipes"
              :key="recipe.id"
              class="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left"
              :class="[
                isInCollection(recipe.id)
                  ? 'bg-neutral-100 dark:bg-neutral-800 opacity-60 cursor-not-allowed'
                  : isSelected(recipe.id)
                    ? 'bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-500'
                    : 'bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700'
              ]"
              :disabled="isInCollection(recipe.id)"
              @click="toggleRecipe(recipe.id)"
            >
              <img
                v-if="recipe.coverPhoto"
                :src="recipe.coverPhoto"
                :alt="recipe.title"
                class="w-14 h-14 rounded-lg object-cover flex-shrink-0"
              >
              <div
                v-else
                class="w-14 h-14 rounded-lg bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center flex-shrink-0"
              >
                <UIcon
                  name="i-heroicons-photo"
                  class="w-6 h-6 text-neutral-400"
                />
              </div>

              <div class="flex-1 min-w-0">
                <p class="font-medium text-neutral-700 dark:text-neutral-100 truncate">
                  {{ recipe.title }}
                </p>
                <p
                  v-if="isInCollection(recipe.id)"
                  class="text-xs text-sage-600 dark:text-sage-400 flex items-center gap-1 mt-0.5"
                >
                  <UIcon
                    name="i-heroicons-check-circle"
                    class="w-3.5 h-3.5"
                  />
                  Already in cookbook
                </p>
              </div>

              <div
                v-if="!isInCollection(recipe.id)"
                class="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                :class="[
                  isSelected(recipe.id)
                    ? 'bg-primary-500 border-primary-500'
                    : 'border-neutral-300 dark:border-neutral-600'
                ]"
              >
                <UIcon
                  v-if="isSelected(recipe.id)"
                  name="i-heroicons-check"
                  class="w-4 h-4 text-white"
                />
              </div>
            </button>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-4 border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
          <!-- Progress bar during adding -->
          <div v-if="adding" class="mb-3">
            <div class="flex items-center justify-between text-sm text-neutral-600 dark:text-neutral-400 mb-1">
              <span>Adding recipes...</span>
              <span>{{ addedCount }} / {{ selectedIds.size }}</span>
            </div>
            <div class="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
              <div
                class="h-full bg-primary-500 transition-all duration-200 ease-out"
                :style="{ width: `${addProgress}%` }"
              />
            </div>
          </div>

          <UButton
            color="primary"
            block
            size="lg"
            :disabled="selectedIds.size === 0 || adding"
            :loading="adding"
            class="press-effect"
            @click="addSelected"
          >
            <UIcon
              name="i-heroicons-plus"
              class="w-5 h-5 mr-2"
            />
            Add {{ selectedIds.size || '' }} {{ selectedIds.size === 1 ? 'Recipe' : 'Recipes' }}
          </UButton>
        </div>
      </div>
    </template>
  </USlideover>
</template>
