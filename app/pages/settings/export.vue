<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

useSeoMeta({
  title: 'Export Data',
})

const exporting = ref(false)

async function downloadJSON(): Promise<void> {
  exporting.value = true
  try {
    const response = await $fetch('/api/export/recipes')

    // Convert response to JSON string and create blob
    const jsonString = JSON.stringify(response, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })

    // Create download link
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `twoteaspoons-export-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  } catch (err) {
    console.error('Export failed:', err)
  }
  exporting.value = false
}
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 sm:px-6 py-8">
    <!-- Back link -->
    <NuxtLink
      to="/settings"
      class="text-neutral-500 hover:text-primary-500 flex items-center gap-1 mb-6"
    >
      <UIcon name="i-heroicons-arrow-left" />
      Back to Settings
    </NuxtLink>

    <h1 class="text-3xl font-bold text-neutral-700 dark:text-neutral-50 mb-2">
      Export Your Data
    </h1>
    <p class="text-neutral-500 dark:text-neutral-400 mb-8">
      Download a copy of all your recipes, favorites, and collections
    </p>

    <!-- Export Options -->
    <div class="space-y-4">
      <!-- JSON Export -->
      <UCard>
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100 mb-1">
              JSON Export
            </h2>
            <p class="text-sm text-neutral-500 dark:text-neutral-400">
              Export all your data in a machine-readable format. Includes recipes,
              ingredients, instructions, favorites, and collections.
            </p>
          </div>
          <UButton
            color="primary"
            icon="i-heroicons-arrow-down-tray"
            :loading="exporting"
            @click="downloadJSON"
          >
            Download
          </UButton>
        </div>
      </UCard>

      <!-- PDF Export (Coming Soon) -->
      <UCard class="opacity-60">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100 mb-1">
              PDF Cookbook
              <UBadge
                color="neutral"
                variant="subtle"
                class="ml-2"
              >
                Coming Soon
              </UBadge>
            </h2>
            <p class="text-sm text-neutral-500 dark:text-neutral-400">
              Generate a beautifully formatted PDF cookbook with all your recipes.
              Perfect for printing or sharing.
            </p>
          </div>
          <UButton
            color="neutral"
            variant="outline"
            icon="i-heroicons-document"
            disabled
          >
            Download
          </UButton>
        </div>
      </UCard>
    </div>

    <!-- Data Info -->
    <div class="mt-8 p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
      <h3 class="font-medium text-neutral-700 dark:text-neutral-100 mb-2">
        What's included in your export?
      </h3>
      <ul class="text-sm text-neutral-500 dark:text-neutral-400 space-y-1">
        <li class="flex items-center gap-2">
          <UIcon
            name="i-heroicons-check"
            class="w-4 h-4 text-green-500"
          />
          All your created recipes with ingredients and instructions
        </li>
        <li class="flex items-center gap-2">
          <UIcon
            name="i-heroicons-check"
            class="w-4 h-4 text-green-500"
          />
          Your favorited recipes
        </li>
        <li class="flex items-center gap-2">
          <UIcon
            name="i-heroicons-check"
            class="w-4 h-4 text-green-500"
          />
          Your collections and their recipe lists
        </li>
        <li class="flex items-center gap-2">
          <UIcon
            name="i-heroicons-check"
            class="w-4 h-4 text-green-500"
          />
          Source attribution for imported recipes
        </li>
      </ul>
    </div>
  </div>
</template>
