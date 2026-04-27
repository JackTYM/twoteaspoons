<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

useSeoMeta({
  title: 'Export Data',
})

const { getAuthHeaders } = useAuth()
const exportingJson = ref(false)
const selectedFormat = ref('full')

interface FormatOption {
  value: string
  label: string
  description: string
  icon: string
}

const formatOptions: FormatOption[] = [
  { value: '3x5', label: '3x5 Index Card', description: 'Classic recipe card size', icon: 'i-heroicons-credit-card' },
  { value: '4x6', label: '4x6 Card', description: 'Larger recipe card', icon: 'i-heroicons-photo' },
  { value: 'a6', label: 'A6', description: 'International small format', icon: 'i-heroicons-document' },
  { value: 'half-letter', label: 'Half Letter', description: '5.5" x 8.5" booklet size', icon: 'i-heroicons-document-text' },
  { value: 'full', label: 'Full Page', description: '8.5" x 11" standard page', icon: 'i-heroicons-newspaper' },
]

async function downloadJSON(): Promise<void> {
  exportingJson.value = true
  try {
    const response = await $fetch('/api/export/recipes', {
      headers: getAuthHeaders(),
    })

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
  exportingJson.value = false
}

function openPrintPreview(): void {
  // Open print preview page in a new window
  const printUrl = `/settings/export/print?format=${selectedFormat.value}`
  window.open(printUrl, '_blank', 'width=900,height=700')
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
            :loading="exportingJson"
            @click="downloadJSON"
          >
            Download
          </UButton>
        </div>
      </UCard>

      <!-- PDF Cookbook Export -->
      <UCard>
        <div class="space-y-4">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100 mb-1">
                PDF Cookbook
              </h2>
              <p class="text-sm text-neutral-500 dark:text-neutral-400">
                Generate a beautifully formatted PDF cookbook with all your recipes.
                Perfect for printing or sharing.
              </p>
            </div>
            <UButton
              color="primary"
              icon="i-heroicons-printer"
              @click="openPrintPreview"
            >
              Print Preview
            </UButton>
          </div>

          <!-- Format Selection -->
          <div class="border-t border-neutral-200 dark:border-neutral-700 pt-4">
            <label class="text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-3 block">
              Page Format
            </label>
            <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                v-for="format in formatOptions"
                :key="format.value"
                class="relative p-3 rounded-lg border-2 transition-all text-left"
                :class="[
                  selectedFormat === format.value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-neutral-800'
                ]"
                @click="selectedFormat = format.value"
              >
                <UIcon
                  :name="format.icon"
                  class="w-5 h-5 mb-2"
                  :class="[
                    selectedFormat === format.value
                      ? 'text-primary-500'
                      : 'text-neutral-400'
                  ]"
                />
                <p
                  class="font-medium text-xs"
                  :class="[
                    selectedFormat === format.value
                      ? 'text-primary-700 dark:text-primary-300'
                      : 'text-neutral-700 dark:text-neutral-100'
                  ]"
                >
                  {{ format.label }}
                </p>

                <!-- Selected checkmark -->
                <div
                  v-if="selectedFormat === format.value"
                  class="absolute top-1 right-1 w-4 h-4 bg-primary-500 rounded-full flex items-center justify-center"
                >
                  <UIcon
                    name="i-heroicons-check"
                    class="w-2.5 h-2.5 text-white"
                  />
                </div>
              </button>
            </div>
            <p class="text-xs text-neutral-400 mt-2">
              {{ formatOptions.find(f => f.value === selectedFormat)?.description }}
            </p>
          </div>
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
          Your favorited recipes (JSON only)
        </li>
        <li class="flex items-center gap-2">
          <UIcon
            name="i-heroicons-check"
            class="w-4 h-4 text-green-500"
          />
          Your collections and their recipe lists (JSON only)
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
