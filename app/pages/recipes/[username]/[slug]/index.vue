<script setup lang="ts">
import type { RecipeWithRelations } from '~/types/recipe'
import {
  defineRecipe,
  defineHowToStep,
  definePerson,
  defineAggregateRating,
} from '@unhead/schema-org/vue'
import { transformToRecipeWithRelations } from '~/utils/transformCase'

const route = useRoute()
const username = computed(() => route.params.username as string)
const slug = computed(() => route.params.slug as string)
const { user } = useAuth()
const { getRecipeEditUrl } = useRecipeUrl()

// Services
const recipeService = useRecipeService()
const collectionService = useCollectionService()

interface RecipeData {
  recipe: RecipeWithRelations
  isOwner: boolean
}

const { data, status, error } = await useAsyncData<RecipeData>(
  `recipe-${username.value}-${slug.value}`,
  async () => {
    const recipeData = await recipeService.getRecipeBySlug(username.value, slug.value)
    if (!recipeData) {
      throw createError({ statusCode: 404, message: 'Recipe not found' })
    }
    const recipe = transformToRecipeWithRelations(recipeData)
    const isOwner = user.value?.id === recipeData.user_id
    return { recipe, isOwner }
  }
)

const recipe = computed(() => data.value?.recipe)
const isOwner = computed(() => data.value?.isOwner ?? false)

// SEO
watchEffect(() => {
  if (recipe.value) {
    useSeoMeta({
      title: recipe.value.title,
      description:
        recipe.value.description || `Recipe for ${recipe.value.title}`,
      ogImage: recipe.value.coverPhoto || undefined,
    })
  }
})

// Schema.org Recipe structured data
// Helper to format time as ISO 8601 duration (PT{minutes}M or PT{hours}H{minutes}M)
function formatDuration(minutes: number | null): string | undefined {
  if (!minutes) return undefined
  if (minutes < 60) return `PT${minutes}M`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `PT${hours}H${mins}M` : `PT${hours}H`
}

// Format ingredient as readable string
function formatIngredient(ing: { amount: string | null; unit: string | null; item: string; notes: string | null }): string {
  const parts: string[] = []
  if (ing.amount) parts.push(ing.amount)
  if (ing.unit) parts.push(ing.unit)
  parts.push(ing.item)
  if (ing.notes) parts.push(`(${ing.notes})`)
  return parts.join(' ')
}

// Generate Schema.org structured data when recipe is available
watchEffect(() => {
  if (recipe.value) {
    const r = recipe.value
    const totalTime = (r.prepTime || 0) + (r.cookTime || 0)

    useSchemaOrg([
      defineRecipe({
        name: r.title,
        description: r.description || `Recipe for ${r.title}`,
        image: r.coverPhoto || undefined,
        author: definePerson({
          name: r.author.name,
          url: r.author.username
            ? `https://twotsps.com/users/${r.author.username}`
            : undefined,
        }),
        datePublished: r.createdAt ? new Date(r.createdAt).toISOString() : undefined,
        dateModified: r.updatedAt ? new Date(r.updatedAt).toISOString() : undefined,
        prepTime: formatDuration(r.prepTime),
        cookTime: formatDuration(r.cookTime),
        totalTime: totalTime > 0 ? formatDuration(totalTime) : undefined,
        recipeYield: r.servings ? `${r.servings} servings` : undefined,
        recipeIngredient: r.ingredients.map(formatIngredient),
        recipeInstructions: r.instructions.map((inst) =>
          defineHowToStep({
            text: inst.content,
            position: inst.stepNumber,
            image: inst.photo || undefined,
          })
        ),
        // Include aggregate rating if we have rating data
        ...(r.avgTasteRating && r.ratingCount && r.ratingCount > 0
          ? {
              aggregateRating: defineAggregateRating({
                ratingValue: parseFloat(r.avgTasteRating),
                ratingCount: r.ratingCount,
                bestRating: 5,
                worstRating: 1,
              }),
            }
          : {}),
        // Source attribution
        ...(r.sourceUrl ? { isBasedOn: r.sourceUrl } : {}),
      }),
    ])
  }
})

// Delete handling
const showDeleteModal = ref(false)
const deleting = ref(false)

async function handleDelete(): Promise<void> {
  deleting.value = true
  try {
    if (recipe.value) {
      await recipeService.deleteRecipe(recipe.value.id)
    }
    navigateTo('/browse')
  } catch (err) {
    console.error('Failed to delete recipe:', err)
  }
  deleting.value = false
}

// Collections
const { data: collectionsData } = await useAsyncData<{ collections: Array<{ id: number; name: string }> }>(
  'user-collections',
  async () => {
    const { data } = await collectionService.getMyCollections()
    return {
      collections: (data || []).map((c) => ({
        id: c.id,
        name: c.name,
      })),
    }
  }
)
const collections = computed(() => collectionsData.value?.collections || [])
const addingToCollection = ref(false)

async function addToCollection(collectionId: number): Promise<void> {
  addingToCollection.value = true
  try {
    if (recipe.value) {
      await collectionService.addRecipeToCollection(collectionId, recipe.value.id)
    }
    // Show success toast or notification
  } catch (err) {
    console.error('Failed to add to collection:', err)
  }
  addingToCollection.value = false
}

// Forking
// Fork info - fetched using service
const { data: forkInfoData } = await useAsyncData(
  `forks-${username.value}-${slug.value}`,
  async () => {
    if (!recipe.value) return null
    return recipeService.getForkInfo(recipe.value.id)
  },
  { watch: [recipe] }
)
const forkInfo = computed(() => forkInfoData.value)

const forking = ref(false)

// Ingredient scaling - passed to cook mode
const ingredientScale = ref(1)

async function handleFork(): Promise<void> {
  if (!recipe.value) return

  forking.value = true
  try {
    const forkedRecipe = await recipeService.forkRecipe(recipe.value.id)
    if (forkedRecipe) {
      // Navigate to the edit page of the forked recipe
      navigateTo(getRecipeEditUrl({
        slug: forkedRecipe.slug,
        author: forkedRecipe.author,
      }))
    }
  } catch (err) {
    console.error('Failed to fork recipe:', err)
  }
  forking.value = false
}
</script>

<template>
  <div>
    <!-- Loading State -->
    <div
      v-if="status === 'pending'"
      class="max-w-5xl mx-auto px-4 sm:px-6 py-8"
    >
      <!-- Hero Skeleton -->
      <div class="h-64 md:h-80 rounded-2xl mb-6 animate-shimmer" />
      <!-- Title Skeleton -->
      <div class="h-8 w-2/3 mb-4 rounded-lg animate-shimmer" />
      <div class="h-4 w-1/2 mb-8 rounded animate-shimmer" />
      <!-- Content Skeleton -->
      <div class="grid md:grid-cols-3 gap-8">
        <div class="md:col-span-1">
          <div class="h-96 rounded-xl animate-shimmer" />
        </div>
        <div class="md:col-span-2 space-y-4">
          <div class="h-24 rounded-xl animate-shimmer" />
          <div class="h-24 rounded-xl animate-shimmer" />
          <div class="h-24 rounded-xl animate-shimmer" />
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <EmptyState
        icon="i-heroicons-exclamation-circle"
        title="Recipe not found"
        description="This recipe doesn't exist or has been deleted."
      >
        <UButton to="/browse" color="primary" icon="i-heroicons-arrow-left">
          Back to recipes
        </UButton>
      </EmptyState>
    </div>

    <!-- Recipe Content -->
    <template v-else-if="recipe">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
        <!-- Breadcrumbs -->
        <Breadcrumbs
          :items="[
            { label: 'Browse', to: '/browse', icon: 'i-heroicons-magnifying-glass' },
            { label: recipe.title },
          ]"
          class="mb-6"
        />

        <!-- Recipe Header (Hero) -->
        <RecipeDetailRecipeHeader
          :recipe="recipe"
          :is-owner="isOwner"
          :collections="collections"
          :forking="forking"
          :adding-to-collection="addingToCollection"
          :scale="ingredientScale"
          @fork="handleFork"
          @add-to-collection="addToCollection"
          @delete="showDeleteModal = true"
        />

        <!-- Main Content Grid -->
        <div class="grid md:grid-cols-3 gap-8 mt-10">
          <!-- Sidebar: Ingredients -->
          <div class="md:col-span-1">
            <RecipeDetailIngredientCard
              v-model="ingredientScale"
              :ingredients="recipe.ingredients"
              :servings="recipe.servings"
            />
          </div>

          <!-- Main Content -->
          <div class="md:col-span-2 space-y-8">
            <!-- Instructions Timeline -->
            <RecipeDetailInstructionTimeline
              :instructions="recipe.instructions"
            />

            <!-- Source Attribution (external imports) -->
            <RecipeDetailSourceAttribution
              :source-url="recipe.sourceUrl"
              :source-site="recipe.sourceSite"
              :source-author="recipe.sourceAuthor"
            />

            <!-- Fork Info (internal forks/variations) -->
            <RecipeDetailForkInfo
              v-if="forkInfo && (forkInfo.parent || forkInfo.forks.length > 0)"
              :fork-info="forkInfo"
            />
          </div>
        </div>

        <!-- Comments Section -->
        <div
          class="mt-12 pt-8 border-t border-neutral-200 dark:border-neutral-700"
        >
          <RecipeComments
            v-if="recipe"
            :recipe-id="recipe.id"
          />
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <UModal
        v-model:open="showDeleteModal"
        title="Delete Recipe"
        description="Confirm deletion of recipe"
      >
        <template #content>
          <UCard>
            <template #header>
              <div class="flex items-center gap-3">
                <span
                  class="w-10 h-10 rounded-full bg-error-100 dark:bg-error-900 flex items-center justify-center"
                >
                  <UIcon
                    name="i-heroicons-trash"
                    class="w-5 h-5 text-error-600 dark:text-error-400"
                  />
                </span>
                <h3
                  class="text-lg font-display text-neutral-700 dark:text-neutral-100"
                >
                  Delete Recipe
                </h3>
              </div>
            </template>
            <p class="text-neutral-600 dark:text-neutral-300">
              Are you sure you want to delete
              <strong>{{ recipe.title }}</strong
              >?
            </p>
            <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
              This action cannot be undone. All comments and cook logs
              associated with this recipe will also be deleted.
            </p>
            <template #footer>
              <div class="flex justify-end gap-3">
                <UButton
                  color="neutral"
                  variant="outline"
                  @click="showDeleteModal = false"
                >
                  Cancel
                </UButton>
                <UButton color="error" :loading="deleting" @click="handleDelete">
                  Delete Recipe
                </UButton>
              </div>
            </template>
          </UCard>
        </template>
      </UModal>
    </template>
  </div>
</template>
