<script setup lang="ts">
interface Props {
  sourceUrl?: string | null
  sourceSite?: string | null
  sourceAuthor?: string | null
}

defineProps<Props>()
</script>

<template>
  <UCard
    v-if="sourceUrl"
    class="bg-neutral-50 dark:bg-neutral-800"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <span class="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
          <UIcon
            name="i-heroicons-globe-alt"
            class="w-5 h-5 text-primary-600 dark:text-primary-400"
          />
        </span>
        <h2 class="text-lg font-display text-neutral-700 dark:text-neutral-100">
          Imported From
        </h2>
      </div>
    </template>

    <div class="flex items-start gap-3">
      <div class="flex-shrink-0 w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
        <UIcon
          name="i-heroicons-link"
          class="w-4 h-4 text-neutral-500 dark:text-neutral-400"
        />
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm text-neutral-500 dark:text-neutral-400">
          Adapted from
        </p>
        <a
          :href="sourceUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="text-primary-600 dark:text-primary-400 hover:underline font-medium truncate block"
        >
          {{ sourceSite || sourceAuthor || 'Original Recipe' }}
        </a>
        <p
          v-if="sourceAuthor && sourceSite"
          class="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5"
        >
          by {{ sourceAuthor }}
        </p>
      </div>
      <UButton
        :href="sourceUrl"
        target="_blank"
        size="sm"
        color="neutral"
        variant="outline"
        icon="i-heroicons-arrow-top-right-on-square"
        class="flex-shrink-0"
      >
        View
      </UButton>
    </div>
  </UCard>
</template>
