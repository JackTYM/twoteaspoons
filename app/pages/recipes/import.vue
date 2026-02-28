<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

useSeoMeta({
  title: 'Import Recipe',
  description: 'Import a recipe from any URL',
})

// Import state
const url = ref('')
const importing = ref(false)
const importError = ref('')

// Imported data for editing
const importedData = ref<{
  title: string
  description?: string
  coverPhoto?: string
  prepTime?: number
  cookTime?: number
  servings?: number
  sourceUrl?: string
  sourceAuthor?: string
  sourceSite?: string
  ingredients: Array<{ amount?: string; unit?: string; item: string; notes?: string }>
  instructions: Array<{ content: string }>
} | null>(null)

// Saving state
const saving = ref(false)
const saveError = ref('')

async function handleImport(): Promise<void> {
  if (!url.value.trim()) return

  importing.value = true
  importError.value = ''
  importedData.value = null

  try {
    const result = await $fetch<{ recipe: typeof importedData.value }>('/api/recipes/import', {
      method: 'POST',
      body: { url: url.value },
    })
    importedData.value = result.recipe
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'data' in err) {
      const fetchErr = err as { data?: { message?: string } }
      importError.value = fetchErr.data?.message || 'Failed to import recipe'
    } else {
      importError.value = 'Failed to import recipe'
    }
  }

  importing.value = false
}

interface RecipeFormData {
  title: string
  description: string
  coverPhoto: string
  prepTime: number | null
  cookTime: number | null
  servings: number
  sourceUrl: string
  sourceAuthor: string
  sourceSite: string
  ingredients: Array<{ amount: string; unit: string; item: string; notes: string }>
  instructions: Array<{ content: string; timerMinutes: number | null }>
}

async function handleSave(formData: RecipeFormData): Promise<void> {
  saving.value = true
  saveError.value = ''

  try {
    const result = await $fetch<{ recipe: { id: number } }>('/api/recipes', {
      method: 'POST',
      body: formData,
    })
    navigateTo(`/recipes/${result.recipe.id}`)
  } catch (err) {
    saveError.value = err instanceof Error ? err.message : 'Failed to save recipe'
  }

  saving.value = false
}

function resetImport(): void {
  importedData.value = null
  url.value = ''
  importError.value = ''
}
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 py-8">
    <h1 class="text-3xl font-bold text-neutral-700 dark:text-neutral-50 mb-2">
      Import Recipe
    </h1>
    <p class="text-neutral-500 dark:text-neutral-400 mb-8">
      Paste a URL from any recipe website to import it. No more life stories - just the recipe.
    </p>

    <!-- URL Input (shown when no imported data) -->
    <div
      v-if="!importedData"
      class="space-y-4"
    >
      <UCard class="bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700">
        <form
          class="space-y-4"
          @submit.prevent="handleImport"
        >
          <UFormField
            label="Recipe URL"
            name="url"
          >
            <UInput
              v-model="url"
              type="url"
              placeholder="https://example.com/recipe/..."
              icon="i-heroicons-link"
              size="lg"
              required
              autofocus
            />
          </UFormField>

          <UAlert
            v-if="importError"
            color="error"
            variant="soft"
            :title="importError"
            icon="i-heroicons-exclamation-circle"
          />

          <UButton
            type="submit"
            color="primary"
            size="lg"
            block
            :loading="importing"
            icon="i-heroicons-arrow-down-tray"
          >
            Import Recipe
          </UButton>
        </form>
      </UCard>

      <div class="text-center text-sm text-neutral-500 dark:text-neutral-400">
        <p>Works with most recipe websites including:</p>
        <p class="mt-1">AllRecipes, Food Network, NYT Cooking, Serious Eats, and more</p>
      </div>
    </div>

    <!-- Imported Recipe Form (shown after successful import) -->
    <div v-else>
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
          <UIcon
            name="i-heroicons-check-circle"
            class="w-5 h-5 text-success-500"
          />
          <span>Imported from {{ importedData.sourceSite || 'external source' }}</span>
        </div>
        <UButton
          variant="ghost"
          color="neutral"
          size="sm"
          icon="i-heroicons-arrow-path"
          @click="resetImport"
        >
          Import Different URL
        </UButton>
      </div>

      <UAlert
        v-if="saveError"
        color="error"
        variant="soft"
        :title="saveError"
        icon="i-heroicons-exclamation-circle"
        class="mb-6"
      />

      <RecipeForm
        :initial-data="importedData"
        submit-label="Save to My Recipes"
        :loading="saving"
        @submit="handleSave"
      />
    </div>
  </div>
</template>
