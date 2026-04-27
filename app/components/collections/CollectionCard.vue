<script setup lang="ts">
import type { DbCollection } from '~/types/database'

// Accepts DbCollection with snake_case fields from the Data API
type CollectionProp = DbCollection & { recipe_count: number }

interface Props {
  collection: CollectionProp
}

defineProps<Props>()

const emit = defineEmits<{
  delete: []
}>()

// Generate consistent gradient based on name hash
type GradientPair = [string, string]

const gradients: GradientPair[] = [
  ['#F87171', '#FBBF24'], // red to yellow
  ['#60A5FA', '#34D399'], // blue to green
  ['#A78BFA', '#F472B6'], // purple to pink
  ['#FBBF24', '#F97316'], // yellow to orange
  ['#34D399', '#06B6D4'], // green to cyan
  ['#C97B5D', '#DCBE72'], // terracotta to butter
]

const defaultGradient: GradientPair = ['#C97B5D', '#DCBE72']

function gradientForName(name: string): string {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const pair = gradients[hash % gradients.length] ?? defaultGradient
  return `linear-gradient(135deg, ${pair[0]}, ${pair[1]})`
}

// Preview photos not currently supported by the Data API service
const previewPhotos = computed(() => [] as string[])
</script>

<template>
  <NuxtLink
    :to="`/collections/${collection.slug}`"
    class="block group"
  >
    <div class="relative rounded-xl overflow-hidden hover-lift transition-all bg-white dark:bg-neutral-800 shadow-sm hover:shadow-md">
      <!-- Cover image or gradient -->
      <div class="relative h-36">
        <img
          v-if="collection.cover_photo"
          :src="collection.cover_photo"
          :alt="collection.name"
          class="w-full h-full object-cover"
        >
        <div
          v-else
          class="w-full h-full flex items-center justify-center"
          :style="{ background: gradientForName(collection.name) }"
        >
          <UIcon
            name="i-heroicons-folder"
            class="w-12 h-12 text-white/50"
          />
        </div>

        <!-- Recipe photo stack (if no cover but has recipe photos) -->
        <div
          v-if="!collection.cover_photo && previewPhotos.length"
          class="absolute bottom-3 left-3 flex -space-x-3"
        >
          <img
            v-for="(photo, i) in previewPhotos"
            :key="i"
            :src="photo"
            class="w-10 h-10 rounded-lg border-2 border-white dark:border-neutral-800 object-cover shadow"
            :style="{ zIndex: previewPhotos.length - i }"
          >
        </div>

        <!-- Visibility badge -->
        <div class="absolute top-3 right-3">
          <UBadge
            :color="collection.is_public ? 'success' : 'neutral'"
            variant="solid"
            size="xs"
          >
            <UIcon
              :name="collection.is_public ? 'i-heroicons-globe-alt' : 'i-heroicons-lock-closed'"
              class="w-3 h-3 mr-1"
            />
            {{ collection.is_public ? 'Public' : 'Private' }}
          </UBadge>
        </div>

        <!-- Delete button overlay -->
        <div class="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <UButton
            color="error"
            variant="solid"
            icon="i-heroicons-trash"
            size="xs"
            aria-label="Delete cookbook"
            @click.prevent="emit('delete')"
          />
        </div>
      </div>

      <!-- Content -->
      <div class="p-4">
        <h3 class="font-semibold text-neutral-700 dark:text-neutral-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
          {{ collection.name }}
        </h3>
        <p
          v-if="collection.description"
          class="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-1 mt-1"
        >
          {{ collection.description }}
        </p>
        <p class="text-sm text-neutral-400 dark:text-neutral-500 mt-2 flex items-center gap-1">
          <UIcon
            name="i-heroicons-book-open"
            class="w-4 h-4"
          />
          {{ collection.recipe_count }} {{ collection.recipe_count === 1 ? 'recipe' : 'recipes' }}
        </p>
      </div>
    </div>
  </NuxtLink>
</template>
