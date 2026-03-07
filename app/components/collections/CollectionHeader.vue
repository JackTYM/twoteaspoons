<script setup lang="ts">
interface Collection {
  id: number
  name: string
  slug?: string
  description: string | null
  isPublic: boolean
  coverPhoto: string | null
}

interface Props {
  collection: Collection
  recipeCount: number
  isOwner: boolean
  useSlug?: boolean
}

const props = defineProps<Props>()

const editUrl = computed(() => {
  if (props.useSlug) {
    return `/collections/${props.collection.slug}/edit`
  }
  return `/collections/${props.collection.id}/edit`
})

// Generate consistent gradient based on name hash
type GradientPair = [string, string]

const gradients: GradientPair[] = [
  ['#F87171', '#FBBF24'],
  ['#60A5FA', '#34D399'],
  ['#A78BFA', '#F472B6'],
  ['#FBBF24', '#F97316'],
  ['#34D399', '#06B6D4'],
  ['#C97B5D', '#DCBE72'],
]

const defaultGradient: GradientPair = ['#C97B5D', '#DCBE72']

function gradientForName(name: string): string {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const pair = gradients[hash % gradients.length] ?? defaultGradient
  return `linear-gradient(135deg, ${pair[0]}, ${pair[1]})`
}
</script>

<template>
  <div class="relative -mx-4 sm:-mx-6 -mt-8 mb-8">
    <!-- Hero background -->
    <div class="h-48 sm:h-56 relative overflow-hidden">
      <img
        v-if="collection.coverPhoto"
        :src="collection.coverPhoto"
        :alt="collection.name"
        class="w-full h-full object-cover"
      >
      <div
        v-else
        class="w-full h-full"
        :style="{ background: gradientForName(collection.name) }"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
    </div>

    <!-- Content overlay -->
    <div class="absolute bottom-0 left-0 right-0 p-4 sm:p-6 text-white">
      <div class="max-w-4xl mx-auto">
        <Breadcrumbs
          :items="[
            { label: 'Collections', to: '/collections', icon: 'i-heroicons-folder' },
            { label: collection.name }
          ]"
          class="mb-3 breadcrumbs-light"
        />

        <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div class="flex items-center gap-3 flex-wrap">
              <h1 class="text-2xl sm:text-3xl font-display">
                {{ collection.name }}
              </h1>
              <UBadge
                :color="collection.isPublic ? 'success' : 'neutral'"
                variant="solid"
                size="sm"
              >
                <UIcon
                  :name="collection.isPublic ? 'i-heroicons-globe-alt' : 'i-heroicons-lock-closed'"
                  class="w-3 h-3 mr-1"
                />
                {{ collection.isPublic ? 'Public' : 'Private' }}
              </UBadge>
            </div>
            <p
              v-if="collection.description"
              class="text-white/80 mt-2 max-w-xl"
            >
              {{ collection.description }}
            </p>
            <p class="text-white/60 text-sm mt-2 flex items-center gap-1">
              <UIcon
                name="i-heroicons-book-open"
                class="w-4 h-4"
              />
              {{ recipeCount }} {{ recipeCount === 1 ? 'recipe' : 'recipes' }}
            </p>
          </div>

          <UButton
            v-if="isOwner"
            :to="editUrl"
            color="neutral"
            variant="ghost"
            icon="i-heroicons-pencil"
            class="flex-shrink-0 text-white hover:bg-white/20"
          >
            Edit
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.breadcrumbs-light :deep(a),
.breadcrumbs-light :deep(span) {
  color: rgba(255, 255, 255, 0.7);
}

.breadcrumbs-light :deep(a:hover) {
  color: white;
}
</style>
