<script setup lang="ts">
import type { RecipeWithRelations } from '~/types/recipe'

interface Collection {
  id: number
  name: string
}

interface Props {
  recipe: RecipeWithRelations
  isOwner: boolean
  collections: Collection[]
  forking: boolean
  addingToCollection: boolean
  scale?: number
}

const props = withDefaults(defineProps<Props>(), {
  scale: 1,
})
const emit = defineEmits<{
  fork: []
  addToCollection: [collectionId: number]
  delete: []
}>()

const { getRecipeEditUrl, getRecipeCookUrl, getRecipePrintUrl } =
  useRecipeUrl()

const editUrl = computed(() => getRecipeEditUrl(props.recipe))
const cookUrl = computed(() => getRecipeCookUrl(props.recipe, props.scale))
const printUrl = computed(() => getRecipePrintUrl(props.recipe))

function formatTime(minutes: number | null): string {
  if (!minutes) return ''
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`
}

const totalTime = computed(() => {
  const prep = props.recipe.prepTime || 0
  const cook = props.recipe.cookTime || 0
  return prep + cook
})

const collectionMenuItems = computed(() => {
  if (props.collections.length === 0) {
    return [[{
      label: 'No collections yet',
      disabled: true,
    }], [{
      label: 'Create Collection',
      icon: 'i-heroicons-plus',
      to: `/collections/new?recipeId=${props.recipe.id}`,
    }]]
  }

  return [
    props.collections.map(c => ({
      label: c.name,
      icon: 'i-heroicons-folder',
      onSelect: (): void => { emit('addToCollection', c.id) },
    })),
    [{
      label: 'Create Collection',
      icon: 'i-heroicons-plus',
      to: `/collections/new?recipeId=${props.recipe.id}`,
    }],
  ]
})

// Category chip colors based on type
function getCategoryColor(type: string): string {
  switch (type) {
    case 'dietary':
      return 'bg-sage-500/80'
    case 'style':
      return 'bg-butter-500/80'
    case 'meal':
      return 'bg-primary-500/80'
    case 'cuisine':
      return 'bg-terracotta-500/80'
    default:
      return 'bg-white/30'
  }
}
</script>

<template>
  <div class="relative">
    <!-- Hero Cover Photo -->
    <div class="relative overflow-hidden rounded-2xl aspect-[4/3] sm:aspect-[21/9] md:aspect-[3/1]">
      <!-- Cover Image or Placeholder -->
      <div
        v-if="recipe.coverPhoto"
        class="absolute inset-0"
      >
        <img
          :src="recipe.coverPhoto"
          :alt="recipe.title"
          class="w-full h-full object-cover"
        >
      </div>
      <div
        v-else
        class="absolute inset-0 bg-gradient-to-br from-primary-200 to-terracotta-200 dark:from-primary-900 dark:to-terracotta-900"
      >
        <div class="absolute inset-0 flex items-center justify-center">
          <UIcon
            name="i-heroicons-photo"
            class="w-16 h-16 text-neutral-400 dark:text-neutral-600"
          />
        </div>
      </div>

      <!-- Gradient Overlay -->
      <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      <!-- Content Overlay -->
      <div class="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8">
        <div class="max-w-4xl mx-auto">
          <!-- Title -->
          <h1 class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display text-white mb-2 sm:mb-3 drop-shadow-lg">
            {{ recipe.title }}
          </h1>

          <!-- Description (truncated) -->
          <p
            v-if="recipe.description"
            class="text-white/90 text-base sm:text-lg max-w-2xl line-clamp-2 mb-2 sm:mb-3 drop-shadow"
          >
            {{ recipe.description }}
          </p>

          <!-- Author -->
          <NuxtLink
            v-if="recipe.author?.username"
            :to="`/users/${recipe.author.username}`"
            class="inline-flex items-center gap-2 mb-4 text-white/80 hover:text-white transition-colors"
          >
            <div
              v-if="recipe.author.avatar"
              class="w-6 h-6 rounded-full overflow-hidden ring-2 ring-white/30"
            >
              <img
                :src="recipe.author.avatar"
                :alt="recipe.author.name"
                class="w-full h-full object-cover"
              >
            </div>
            <div
              v-else
              class="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-medium"
            >
              {{ recipe.author.name?.charAt(0).toUpperCase() }}
            </div>
            <span class="text-sm">by {{ recipe.author.name }}</span>
          </NuxtLink>

          <!-- Metadata Pills -->
          <div class="flex flex-wrap gap-2 md:gap-3">
            <div
              v-if="recipe.prepTime"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm"
            >
              <UIcon
                name="i-heroicons-clock"
                class="w-4 h-4"
              />
              <span>Prep: {{ formatTime(recipe.prepTime) }}</span>
            </div>

            <div
              v-if="recipe.cookTime"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm"
            >
              <UIcon
                name="i-heroicons-fire"
                class="w-4 h-4"
              />
              <span>Cook: {{ formatTime(recipe.cookTime) }}</span>
            </div>

            <div
              v-if="totalTime"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500/80 backdrop-blur-sm rounded-full text-white text-sm font-medium"
            >
              <UIcon
                name="i-heroicons-clock"
                class="w-4 h-4"
              />
              <span>Total: {{ formatTime(totalTime) }}</span>
            </div>

            <div
              v-if="recipe.servings"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm"
            >
              <UIcon
                name="i-heroicons-users"
                class="w-4 h-4"
              />
              <span>{{ recipe.servings }} servings</span>
            </div>
          </div>

          <!-- Category Chips -->
          <div
            v-if="recipe.categories && recipe.categories.length > 0"
            class="flex flex-wrap gap-1.5 mt-3"
          >
            <NuxtLink
              v-for="category in recipe.categories"
              :key="category.id"
              :to="`/browse?categories=${category.slug}`"
              class="inline-flex items-center gap-1 px-2.5 py-1 backdrop-blur-sm rounded-full text-white text-xs font-medium hover:ring-2 hover:ring-white/30 transition-all"
              :class="getCategoryColor(category.type)"
            >
              <UIcon
                v-if="category.icon && category.icon.startsWith('i-')"
                :name="category.icon"
                class="w-3 h-3"
              />
              {{ category.name }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Buttons Bar -->
    <div class="mt-6 flex flex-wrap items-center justify-between gap-4">
      <!-- Primary Actions -->
      <div class="flex flex-wrap items-center gap-2">
        <UButton
          :to="cookUrl"
          color="primary"
          size="lg"
          icon="i-heroicons-play"
          class="press-effect"
        >
          Cook Mode
        </UButton>

        <UButton
          :to="printUrl"
          color="neutral"
          variant="outline"
          icon="i-heroicons-printer"
          class="press-effect"
        >
          Print
        </UButton>

        <!-- Add to Collection -->
        <UDropdownMenu :items="collectionMenuItems">
          <UButton
            color="neutral"
            variant="outline"
            icon="i-heroicons-folder-plus"
            :loading="addingToCollection"
            class="press-effect"
          >
            Save
          </UButton>
        </UDropdownMenu>

        <!-- Fork Recipe (create a copy/variant) -->
        <UButton
          color="neutral"
          variant="outline"
          icon="i-heroicons-document-duplicate"
          :loading="forking"
          class="press-effect"
          @click="emit('fork')"
        >
          Remix
        </UButton>
      </div>

      <!-- Owner Actions -->
      <div
        v-if="isOwner"
        class="flex items-center gap-2"
      >
        <UButton
          :to="editUrl"
          color="neutral"
          variant="soft"
          icon="i-heroicons-pencil"
          class="press-effect"
        >
          Edit
        </UButton>

        <UButton
          color="error"
          variant="ghost"
          icon="i-heroicons-trash"
          class="press-effect"
          aria-label="Delete recipe"
          @click="emit('delete')"
        />
      </div>
    </div>
  </div>
</template>
