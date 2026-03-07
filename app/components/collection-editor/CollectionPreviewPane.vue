<script setup lang="ts">
interface Recipe {
  id: number
  title: string
  coverPhoto: string | null
  prepTime: number | null
  cookTime: number | null
}

interface Props {
  name: string
  description: string
  coverPhoto: string
  isPublic: boolean
  recipes: Recipe[]
}

const props = defineProps<Props>()

// Generate gradient from name hash
function gradientForName(name: string): string {
  const defaultGradient = 'linear-gradient(135deg, #C97B5D 0%, #8FA878 100%)'
  if (!name) return defaultGradient

  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }

  const gradients = [
    'linear-gradient(135deg, #C97B5D 0%, #8FA878 100%)',
    'linear-gradient(135deg, #8FA878 0%, #F0D699 100%)',
    'linear-gradient(135deg, #F0D699 0%, #C97B5D 100%)',
    'linear-gradient(135deg, #96724D 0%, #CBA67A 100%)',
    'linear-gradient(135deg, #6B4D35 0%, #C97B5D 100%)',
  ]

  return gradients[Math.abs(hash) % gradients.length] ?? defaultGradient
}

function formatTime(prepTime: number | null, cookTime: number | null): string {
  const total = (prepTime || 0) + (cookTime || 0)
  if (total === 0) return ''
  if (total < 60) return `${total}m`
  const hours = Math.floor(total / 60)
  const mins = total % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

const hasContent = computed(() => props.name || props.recipes.length > 0)
</script>

<template>
  <div class="collection-preview-pane">
    <!-- Preview Badge -->
    <div class="flex justify-center mb-6">
      <div class="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm font-medium">
        <UIcon
          name="i-heroicons-eye"
          class="w-4 h-4"
        />
        <span>Preview Mode</span>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="!hasContent"
      class="text-center py-16"
    >
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
        <UIcon
          name="i-heroicons-eye-slash"
          class="w-8 h-8 text-neutral-400"
        />
      </div>
      <p class="text-neutral-500 dark:text-neutral-400">
        Nothing to preview yet. Add a name or some recipes to see how your collection will look.
      </p>
    </div>

    <!-- Preview Content -->
    <template v-else>
      <!-- Hero Header -->
      <div class="relative overflow-hidden rounded-2xl aspect-[21/9] md:aspect-[3/1] mb-8">
        <!-- Cover Image or Gradient -->
        <div
          v-if="coverPhoto"
          class="absolute inset-0"
        >
          <img
            :src="coverPhoto"
            alt="Collection cover"
            class="w-full h-full object-cover"
          >
        </div>
        <div
          v-else
          class="absolute inset-0"
          :style="{ background: gradientForName(name) }"
        />

        <!-- Gradient Overlay -->
        <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

        <!-- Content Overlay -->
        <div class="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
          <div class="flex items-center gap-2 mb-3">
            <UBadge
              :color="isPublic ? 'success' : 'neutral'"
              variant="solid"
              size="sm"
            >
              <UIcon
                :name="isPublic ? 'i-heroicons-globe-alt' : 'i-heroicons-lock-closed'"
                class="w-3 h-3 mr-1"
              />
              {{ isPublic ? 'Public' : 'Private' }}
            </UBadge>
          </div>

          <h1 class="text-3xl md:text-4xl font-display text-white mb-2">
            {{ name || 'Untitled Collection' }}
          </h1>

          <p
            v-if="description"
            class="text-lg text-white/80 mb-4 line-clamp-2"
          >
            {{ description }}
          </p>

          <div class="flex items-center gap-4 text-white/70 text-sm">
            <span class="flex items-center gap-1.5">
              <UIcon
                name="i-heroicons-book-open"
                class="w-4 h-4"
              />
              {{ recipes.length }} {{ recipes.length === 1 ? 'recipe' : 'recipes' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Recipe Grid Preview -->
      <div
        v-if="recipes.length > 0"
        class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
      >
        <div
          v-for="recipe in recipes"
          :key="recipe.id"
          class="rounded-xl overflow-hidden bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
        >
          <!-- Recipe Image -->
          <div class="aspect-[4/3] relative">
            <img
              v-if="recipe.coverPhoto"
              :src="recipe.coverPhoto"
              :alt="recipe.title"
              class="w-full h-full object-cover"
            >
            <div
              v-else
              class="w-full h-full bg-gradient-to-br from-primary-100 to-terracotta-100 dark:from-primary-900/50 dark:to-terracotta-900/50 flex items-center justify-center"
            >
              <UIcon
                name="i-heroicons-photo"
                class="w-10 h-10 text-neutral-400 dark:text-neutral-600"
              />
            </div>
          </div>

          <!-- Recipe Info -->
          <div class="p-3">
            <h4 class="font-medium text-sm text-neutral-700 dark:text-neutral-200 line-clamp-2">
              {{ recipe.title }}
            </h4>
            <p
              v-if="formatTime(recipe.prepTime, recipe.cookTime)"
              class="text-xs text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-1"
            >
              <UIcon
                name="i-heroicons-clock"
                class="w-3 h-3"
              />
              {{ formatTime(recipe.prepTime, recipe.cookTime) }}
            </p>
          </div>
        </div>
      </div>

      <!-- No Recipes Message -->
      <div
        v-else
        class="text-center py-12 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl"
      >
        <p class="text-neutral-500 dark:text-neutral-400">
          No recipes in this collection yet
        </p>
      </div>
    </template>
  </div>
</template>
