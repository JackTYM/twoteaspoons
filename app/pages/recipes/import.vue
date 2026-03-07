<script setup lang="ts">
import RecipeEditor from '~/components/recipe-editor/RecipeEditor.vue'

definePageMeta({
  middleware: 'auth',
})

useSeoMeta({
  title: 'Import Recipe',
  description: 'Import a recipe from any URL',
})

const { getAuthHeaders } = useAuth()
const { getRecipeUrl } = useRecipeUrl()

// State machine: 'input' → 'importing' → 'success' → 'editing'
type ImportState = 'input' | 'importing' | 'success' | 'editing'
const state = ref<ImportState>('input')

// Import state
const url = ref('')
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

  state.value = 'importing'
  importError.value = ''
  importedData.value = null

  try {
    const result = await $fetch<{ recipe: typeof importedData.value }>('/api/recipes/import', {
      method: 'POST',
      body: { url: url.value },
      headers: getAuthHeaders(),
    })
    importedData.value = result.recipe
    state.value = 'success'
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'data' in err) {
      const fetchErr = err as { data?: { message?: string } }
      importError.value = fetchErr.data?.message || 'Failed to import recipe'
    } else {
      importError.value = 'Failed to import recipe'
    }
    state.value = 'input'
  }
}

function continueToEditor(): void {
  state.value = 'editing'
}

interface IngredientLink {
  id: number
  amount?: string | null
  unit?: string | null
}

interface RecipeFormData {
  title: string
  description: string
  coverPhoto: string
  prepTime: number | null
  cookTime: number | null
  servings: number
  isPublished: boolean
  sourceUrl: string
  sourceAuthor: string
  sourceSite: string
  ingredients: Array<{ amount: string; unit: string; item: string; notes: string }>
  instructions: Array<{ content: string; timerMinutes: number | null; ingredientLinks: IngredientLink[] }>
}

async function handleSave(formData: RecipeFormData): Promise<void> {
  saving.value = true
  saveError.value = ''

  try {
    const result = await $fetch<{ recipe: { id: number; slug: string; author?: { username: string | null } | null } }>('/api/recipes', {
      method: 'POST',
      body: formData,
      headers: getAuthHeaders(),
    })
    navigateTo(getRecipeUrl(result.recipe))
  } catch (err) {
    saveError.value = err instanceof Error ? err.message : 'Failed to save recipe'
  }

  saving.value = false
}

function resetImport(): void {
  importedData.value = null
  url.value = ''
  importError.value = ''
  state.value = 'input'
}
</script>

<template>
  <div class="px-4 sm:px-6 py-8">
    <!-- Non-editing states: centered narrow layout -->
    <div
      v-if="state !== 'editing'"
      class="max-w-3xl mx-auto"
    >
      <!-- Breadcrumbs -->
      <Breadcrumbs
        :items="[
          { label: 'Browse', to: '/browse', icon: 'i-heroicons-magnifying-glass' },
          { label: 'Import' },
        ]"
        class="mb-6"
      />

      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-display text-neutral-700 dark:text-neutral-50 mb-2">
          Import Recipe
        </h1>
        <p class="text-neutral-500 dark:text-neutral-400">
          Paste a URL from any recipe website - we'll skip the life story
        </p>
      </div>

      <!-- State: Input -->
      <Transition
        name="slide-fade"
        mode="out-in"
      >
        <div
          v-if="state === 'input'"
          key="input"
        >
          <ImportUrlInputCard
            v-model="url"
            :importing="false"
            :error="importError"
            @import="handleImport"
          />
          <ImportSupportedSites />
        </div>

        <!-- State: Importing -->
        <div
          v-else-if="state === 'importing'"
          key="importing"
        >
          <ImportProgress />
        </div>

        <!-- State: Success -->
        <div
          v-else-if="state === 'success' && importedData"
          key="success"
        >
          <ImportSuccess
            :recipe="importedData"
            @continue="continueToEditor"
          />
        </div>
      </Transition>
    </div>

    <!-- Editing state: full-width editor layout -->
    <div v-else-if="state === 'editing' && importedData">
      <!-- Breadcrumbs -->
      <div class="max-w-6xl mx-auto mb-6">
        <div class="flex items-center justify-between">
          <Breadcrumbs
            :items="[
              { label: 'Browse', to: '/browse', icon: 'i-heroicons-magnifying-glass' },
              { label: 'Import' },
            ]"
          />
          <div class="flex items-center gap-2">
            <!-- Source badge -->
            <div
              v-if="importedData?.sourceSite"
              class="inline-flex items-center gap-2 px-3 py-1.5 bg-sage-50 dark:bg-sage-900/20 text-sage-700 dark:text-sage-300 rounded-full text-sm"
            >
              <UIcon
                name="i-heroicons-check-circle"
                class="w-4 h-4"
              />
              Imported from {{ importedData.sourceSite }}
            </div>
            <UButton
              variant="ghost"
              color="neutral"
              size="sm"
              icon="i-heroicons-arrow-path"
              @click="resetImport"
            >
              Import Different
            </UButton>
          </div>
        </div>
      </div>

      <UAlert
        v-if="saveError"
        color="error"
        variant="soft"
        :title="saveError"
        icon="i-heroicons-exclamation-circle"
        class="max-w-6xl mx-auto mb-6"
      />

      <RecipeEditor
        :initial-data="importedData"
        submit-label="Save to My Recipes"
        :loading="saving"
        autosave-key="recipe-import"
        mode="create"
        @submit="handleSave"
      />
    </div>
  </div>
</template>

<style scoped>
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
