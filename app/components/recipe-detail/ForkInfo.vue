<script setup lang="ts">
defineProps<Props>()

const { getRecipeUrl } = useRecipeUrl()

interface ForkInfo {
  parent: { id: number; slug: string; title: string; author: { name: string; username: string | null } } | null
  forks: Array<{ id: number; slug: string; title: string; author: { name: string; username: string | null } }>
  forkCount: number
}

interface Props {
  forkInfo: ForkInfo
}

const showAllForks = ref(false)
</script>

<template>
  <UCard
    v-if="forkInfo.parent || (forkInfo.forks && forkInfo.forks.length > 0)"
    class="bg-neutral-50 dark:bg-neutral-800"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <span class="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
          <UIcon
            name="i-heroicons-document-duplicate"
            class="w-5 h-5 text-primary-600 dark:text-primary-400"
          />
        </span>
        <h2 class="text-lg font-display text-neutral-700 dark:text-neutral-100">
          {{ forkInfo.parent ? 'Forked From' : 'Recipe Variations' }}
        </h2>
      </div>
    </template>

    <div class="space-y-4">
      <!-- Forked From -->
      <div
        v-if="forkInfo.parent"
        class="flex items-start gap-3"
      >
        <div class="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
          <UIcon
            name="i-heroicons-arrow-turn-up-left"
            class="w-4 h-4 text-primary-600 dark:text-primary-400"
          />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm text-neutral-500 dark:text-neutral-400">
            Based on
          </p>
          <NuxtLink
            :to="getRecipeUrl(forkInfo.parent)"
            class="text-primary-600 dark:text-primary-400 hover:underline font-medium"
          >
            {{ forkInfo.parent.title }}
          </NuxtLink>
          <p
            v-if="forkInfo.parent.author?.name"
            class="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5"
          >
            by {{ forkInfo.parent.author.name }}
          </p>
        </div>
        <UButton
          :to="getRecipeUrl(forkInfo.parent)"
          size="sm"
          color="neutral"
          variant="outline"
          icon="i-heroicons-arrow-right"
          class="flex-shrink-0"
        >
          View Original
        </UButton>
      </div>

      <!-- Variations / Forks -->
      <div
        v-if="forkInfo.forks && forkInfo.forks.length > 0"
        :class="{ 'pt-4 border-t border-neutral-200 dark:border-neutral-700': forkInfo.parent }"
      >
        <div class="flex items-center gap-2 mb-3">
          <UIcon
            name="i-heroicons-document-duplicate"
            class="w-4 h-4 text-neutral-400"
          />
          <span class="text-sm font-medium text-neutral-600 dark:text-neutral-300">
            {{ forkInfo.forkCount }} Variation{{ forkInfo.forkCount === 1 ? '' : 's' }} of this recipe
          </span>
        </div>

        <div class="space-y-2">
          <NuxtLink
            v-for="fork in (showAllForks ? forkInfo.forks : forkInfo.forks.slice(0, 5))"
            :key="fork.id"
            :to="getRecipeUrl(fork)"
            class="flex items-center justify-between gap-3 px-3 py-2 text-sm bg-neutral-100 dark:bg-neutral-700 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
          >
            <span class="font-medium text-neutral-700 dark:text-neutral-200">{{ fork.title }}</span>
            <span class="text-xs text-neutral-400 whitespace-nowrap">by {{ fork.author?.name }}</span>
          </NuxtLink>

          <UButton
            v-if="forkInfo.forks.length > 5 && !showAllForks"
            size="xs"
            variant="ghost"
            color="neutral"
            @click="showAllForks = true"
          >
            +{{ forkInfo.forks.length - 5 }} more
          </UButton>
        </div>
      </div>
    </div>
  </UCard>
</template>
