<script setup lang="ts">
import type { RecipeWithRelations } from '~/types/recipe'

const route = useRoute()
const id = computed(() => route.params.id as string)

interface RecipeResponse {
  recipe: RecipeWithRelations
  isOwner: boolean
}

const { data, status, error } = await useFetch<RecipeResponse>(`/api/recipes/${id.value}`)

const recipe = computed(() => data.value?.recipe)
const isOwner = computed(() => data.value?.isOwner ?? false)

// SEO
watchEffect(() => {
  if (recipe.value) {
    useSeoMeta({
      title: recipe.value.title,
      description: recipe.value.description || `Recipe for ${recipe.value.title}`,
      ogImage: recipe.value.coverPhoto || undefined,
    })
  }
})

// Scaling
const scale = ref(1)
const scaleOptions = [0.5, 1, 2, 3]

function scaledAmount(amount: string | null): string {
  if (!amount) return ''
  const num = parseFloat(amount)
  if (isNaN(num)) return amount
  const scaled = num * scale.value
  // Smart rounding
  if (scaled === Math.floor(scaled)) return String(scaled)
  if (scaled < 1) return scaled.toFixed(2).replace(/\.?0+$/, '')
  return scaled.toFixed(1).replace(/\.?0+$/, '')
}

function formatTime(minutes: number | null): string {
  if (!minutes) return ''
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`
}

// Delete handling
const showDeleteModal = ref(false)
const deleting = ref(false)

async function handleDelete(): Promise<void> {
  deleting.value = true
  try {
    await $fetch(`/api/recipes/${id.value}`, { method: 'DELETE' })
    navigateTo('/recipes')
  } catch (err) {
    console.error('Failed to delete recipe:', err)
  }
  deleting.value = false
}

// Collections
interface Collection {
  id: number
  name: string
}

const { data: collectionsData } = await useFetch<{ collections: Collection[] }>('/api/collections')
const collections = computed(() => collectionsData.value?.collections || [])
const addingToCollection = ref(false)

async function addToCollection(collectionId: number): Promise<void> {
  addingToCollection.value = true
  try {
    await $fetch(`/api/collections/${collectionId}/recipes`, {
      method: 'POST',
      body: { recipeId: Number(id.value) },
    })
    // Show success toast or notification
  } catch (err) {
    console.error('Failed to add to collection:', err)
  }
  addingToCollection.value = false
}

const collectionMenuItems = computed(() => {
  if (collections.value.length === 0) {
    return [[{
      label: 'No collections yet',
      disabled: true,
    }], [{
      label: 'Create Collection',
      icon: 'i-heroicons-plus',
      to: '/collections/new',
    }]]
  }

  return [
    collections.value.map(c => ({
      label: c.name,
      icon: 'i-heroicons-folder',
      click: (): void => { addToCollection(c.id) },
    })),
    [{
      label: 'Create Collection',
      icon: 'i-heroicons-plus',
      to: '/collections/new',
    }],
  ]
})

// Forking
interface ForkInfo {
  parent: { id: number; title: string; author: { name: string } } | null
  forks: Array<{ id: number; title: string; author: { name: string } }>
  forkCount: number
}

const { data: forksData } = await useFetch<ForkInfo>(`/api/recipes/${id.value}/forks`)
const forkInfo = computed(() => forksData.value)

const forking = ref(false)

async function handleFork(): Promise<void> {
  forking.value = true
  try {
    const result = await $fetch<{ recipe: { id: number } }>(`/api/recipes/${id.value}/fork`, {
      method: 'POST',
    })
    navigateTo(`/recipes/${result.recipe.id}/edit`)
  } catch (err) {
    console.error('Failed to fork recipe:', err)
  }
  forking.value = false
}
</script>

<template>
  <div>
    <!-- Loading -->
    <div
      v-if="status === 'pending'"
      class="max-w-4xl mx-auto px-4 sm:px-6 py-8"
    >
      <USkeleton class="h-64 rounded-xl mb-6" />
      <USkeleton class="h-8 w-1/2 mb-4" />
      <USkeleton class="h-4 w-full mb-2" />
      <USkeleton class="h-4 w-3/4" />
    </div>

    <!-- Error -->
    <div
      v-else-if="error"
      class="max-w-4xl mx-auto px-4 sm:px-6 py-8"
    >
      <UAlert
        color="error"
        variant="soft"
        title="Recipe not found"
        description="This recipe doesn't exist or has been deleted."
        icon="i-heroicons-exclamation-circle"
      />
      <UButton
        to="/recipes"
        variant="link"
        class="mt-4"
        icon="i-heroicons-arrow-left"
      >
        Back to recipes
      </UButton>
    </div>

    <!-- Recipe Content -->
    <template v-else-if="recipe">
      <!-- Hero -->
      <div class="relative">
        <div
          v-if="recipe.coverPhoto"
          class="h-64 md:h-80 bg-neutral-200 dark:bg-neutral-800"
        >
          <img
            :src="recipe.coverPhoto"
            :alt="recipe.title"
            class="w-full h-full object-cover"
          >
          <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
      </div>

      <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <!-- Header -->
        <div class="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 class="text-3xl md:text-4xl font-bold text-neutral-700 dark:text-neutral-50 mb-2">
              {{ recipe.title }}
            </h1>
            <p
              v-if="recipe.description"
              class="text-lg text-neutral-500 dark:text-neutral-400"
            >
              {{ recipe.description }}
            </p>
          </div>

          <div class="flex gap-2 flex-shrink-0">
            <UButton
              :to="`/recipes/${recipe.id}/cook`"
              color="primary"
              icon="i-heroicons-play"
            >
              Cook
            </UButton>

            <!-- Add to Collection -->
            <UDropdown :items="collectionMenuItems">
              <UButton
                color="neutral"
                variant="outline"
                icon="i-heroicons-folder-plus"
                :loading="addingToCollection"
              />
            </UDropdown>

            <!-- Fork Recipe -->
            <UButton
              v-if="!isOwner"
              color="neutral"
              variant="outline"
              icon="i-heroicons-document-duplicate"
              :loading="forking"
              @click="handleFork"
            >
              Fork
            </UButton>

            <template v-if="isOwner">
              <UButton
                :to="`/recipes/${recipe.id}/edit`"
                color="neutral"
                variant="outline"
                icon="i-heroicons-pencil"
              >
                Edit
              </UButton>
              <UButton
                color="error"
                variant="ghost"
                icon="i-heroicons-trash"
                @click="showDeleteModal = true"
              />
            </template>
          </div>
        </div>

        <!-- Meta -->
        <div class="flex flex-wrap gap-4 mb-8 text-sm text-neutral-500 dark:text-neutral-400">
          <span
            v-if="recipe.prepTime"
            class="flex items-center gap-1"
          >
            <UIcon
              name="i-heroicons-clock"
              class="w-4 h-4"
            />
            Prep: {{ formatTime(recipe.prepTime) }}
          </span>
          <span
            v-if="recipe.cookTime"
            class="flex items-center gap-1"
          >
            <UIcon
              name="i-heroicons-fire"
              class="w-4 h-4"
            />
            Cook: {{ formatTime(recipe.cookTime) }}
          </span>
          <span
            v-if="recipe.servings"
            class="flex items-center gap-1"
          >
            <UIcon
              name="i-heroicons-users"
              class="w-4 h-4"
            />
            {{ recipe.servings }} servings
          </span>
        </div>

        <!-- Source Attribution -->
        <div
          v-if="recipe.sourceUrl"
          class="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg mb-8"
        >
          <p class="text-sm text-neutral-500 dark:text-neutral-400">
            Adapted from
            <a
              :href="recipe.sourceUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="text-primary-600 dark:text-primary-400 hover:underline"
            >
              {{ recipe.sourceSite || recipe.sourceAuthor || 'original source' }}
            </a>
          </p>
        </div>

        <!-- Fork Info -->
        <div
          v-if="forkInfo?.parent || (forkInfo?.forks && forkInfo.forks.length > 0)"
          class="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg mb-8"
        >
          <!-- Forked From -->
          <div
            v-if="forkInfo.parent"
            class="flex items-center gap-2 text-sm"
          >
            <UIcon
              name="i-heroicons-arrow-turn-up-left"
              class="w-4 h-4 text-neutral-400"
            />
            <span class="text-neutral-500 dark:text-neutral-400">Forked from</span>
            <NuxtLink
              :to="`/recipes/${forkInfo.parent.id}`"
              class="text-primary-600 dark:text-primary-400 hover:underline"
            >
              {{ forkInfo.parent.title }}
            </NuxtLink>
            <span class="text-neutral-400">by {{ forkInfo.parent.author?.name }}</span>
          </div>

          <!-- Variations -->
          <div
            v-if="forkInfo.forks && forkInfo.forks.length > 0"
            :class="{ 'mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700': forkInfo.parent }"
          >
            <div class="flex items-center gap-2 text-sm mb-2">
              <UIcon
                name="i-heroicons-document-duplicate"
                class="w-4 h-4 text-neutral-400"
              />
              <span class="text-neutral-500 dark:text-neutral-400">
                {{ forkInfo.forkCount }} variation{{ forkInfo.forkCount === 1 ? '' : 's' }}
              </span>
            </div>
            <div class="flex flex-wrap gap-2">
              <NuxtLink
                v-for="fork in forkInfo.forks.slice(0, 5)"
                :key="fork.id"
                :to="`/recipes/${fork.id}`"
                class="text-sm px-2 py-1 bg-neutral-200 dark:bg-neutral-700 rounded hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
              >
                {{ fork.title }}
              </NuxtLink>
              <span
                v-if="forkInfo.forks.length > 5"
                class="text-sm text-neutral-400 py-1"
              >
                +{{ forkInfo.forks.length - 5 }} more
              </span>
            </div>
          </div>
        </div>

        <div class="grid md:grid-cols-3 gap-8">
          <!-- Ingredients -->
          <div class="md:col-span-1">
            <div class="sticky top-20">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-xl font-semibold text-neutral-700 dark:text-neutral-100">
                  Ingredients
                </h2>
              </div>

              <!-- Scale Controls -->
              <div class="flex gap-2 mb-4">
                <UButton
                  v-for="s in scaleOptions"
                  :key="s"
                  size="sm"
                  :color="scale === s ? 'primary' : 'neutral'"
                  :variant="scale === s ? 'solid' : 'outline'"
                  @click="scale = s"
                >
                  {{ s === 1 ? '1x' : s < 1 ? '½x' : `${s}x` }}
                </UButton>
              </div>

              <ul class="space-y-2">
                <li
                  v-for="ingredient in recipe.ingredients"
                  :key="ingredient.id"
                  class="flex items-baseline gap-2 text-neutral-600 dark:text-neutral-300"
                >
                  <span class="font-medium">
                    {{ scaledAmount(ingredient.amount) }} {{ ingredient.unit }}
                  </span>
                  <span>{{ ingredient.item }}</span>
                  <span
                    v-if="ingredient.notes"
                    class="text-sm text-neutral-400"
                  >
                    ({{ ingredient.notes }})
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <!-- Instructions -->
          <div class="md:col-span-2">
            <h2 class="text-xl font-semibold text-neutral-700 dark:text-neutral-100 mb-4">
              Instructions
            </h2>
            <ol class="space-y-6">
              <li
                v-for="instruction in recipe.instructions"
                :key="instruction.id"
                class="flex gap-4"
              >
                <span class="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 flex items-center justify-center font-semibold">
                  {{ instruction.stepNumber }}
                </span>
                <div class="flex-1 pt-1">
                  <p class="text-neutral-600 dark:text-neutral-300">
                    {{ instruction.content }}
                  </p>
                  <div
                    v-if="instruction.timerMinutes"
                    class="mt-2"
                  >
                    <UBadge
                      color="warning"
                      variant="soft"
                    >
                      <UIcon
                        name="i-heroicons-clock"
                        class="w-3 h-3 mr-1"
                      />
                      {{ formatTime(instruction.timerMinutes) }}
                    </UBadge>
                  </div>
                </div>
              </li>
            </ol>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <UModal v-model:open="showDeleteModal">
        <template #content>
          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">
                Delete Recipe
              </h3>
            </template>
            <p class="text-neutral-500 dark:text-neutral-400">
              Are you sure you want to delete "{{ recipe.title }}"? This action cannot be undone.
            </p>
            <template #footer>
              <div class="flex justify-end gap-2">
                <UButton
                  color="neutral"
                  variant="outline"
                  @click="showDeleteModal = false"
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
    </template>
  </div>
</template>
