<script setup lang="ts">
import type { ImportResponse, ImportRecipe } from '~/types/import'

definePageMeta({
  middleware: 'auth',
})

useSeoMeta({ title: 'Admin: Import for User' })

const { user, getAuthHeaders } = useAuth()

const ADMIN_EMAIL = 'jacksonkyarger@gmail.com'
const isAdmin = computed(() => user.value?.email === ADMIN_EMAIL)

const fileInput = ref<HTMLInputElement | null>(null)
const targetUsername = ref('')
const jsonContent = ref('')
const parsedRecipes = ref<ImportRecipe[]>([])
const parseError = ref<string | null>(null)
const importing = ref(false)
const importResult = ref<ImportResponse | null>(null)
const importProgress = ref(0)
const currentlyImporting = ref<string | null>(null)
const liveResults = ref<ImportResponse['results']>([])

function handleFileSelect(event: Event): void {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e): void => {
    jsonContent.value = e.target?.result as string
    parseJson()
  }
  reader.readAsText(file)
}

function parseJson(): void {
  parseError.value = null
  parsedRecipes.value = []
  importResult.value = null
  if (!jsonContent.value.trim()) return
  try {
    const data = JSON.parse(jsonContent.value)
    let recipeList: ImportRecipe[]
    if (Array.isArray(data)) {
      recipeList = data
    } else if (data.recipes && Array.isArray(data.recipes)) {
      recipeList = data.recipes
    } else {
      parseError.value = 'JSON must be an array of recipes or an object with a "recipes" array'
      return
    }
    if (recipeList.length === 0) { parseError.value = 'No recipes found in JSON'; return }
    if (recipeList.length > 100) { parseError.value = 'Maximum 100 recipes per import'; return }
    parsedRecipes.value = recipeList
  } catch (err) {
    parseError.value = err instanceof Error ? err.message : 'Invalid JSON'
  }
}

async function importRecipes(): Promise<void> {
  if (parsedRecipes.value.length === 0 || !targetUsername.value.trim()) return

  importing.value = true
  importResult.value = null
  importProgress.value = 0
  liveResults.value = []
  currentlyImporting.value = null

  const total = parsedRecipes.value.length
  let successful = 0
  let failed = 0

  for (let i = 0; i < parsedRecipes.value.length; i++) {
    const recipe = parsedRecipes.value[i]
    if (!recipe) continue
    const recipeTitle = recipe.title || `Recipe ${i + 1}`
    currentlyImporting.value = recipeTitle

    try {
      const result = await $fetch<ImportResponse>('/api/admin/import-for-user', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: { targetUsername: targetUsername.value.trim(), recipes: [recipe] },
      })
      if (result.results[0]) {
        liveResults.value.push(result.results[0])
        if (result.results[0].success) { successful++ } else { failed++ }
      }
    } catch (err) {
      liveResults.value.push({
        title: recipeTitle,
        success: false,
        error: err instanceof Error ? err.message : 'Import failed',
      })
      failed++
    }

    importProgress.value = ((i + 1) / total) * 100
  }

  currentlyImporting.value = null
  importing.value = false
  importResult.value = { total, successful, failed, results: liveResults.value }
}

function reset(): void {
  jsonContent.value = ''
  parsedRecipes.value = []
  parseError.value = null
  importResult.value = null
  importProgress.value = 0
  currentlyImporting.value = null
  liveResults.value = []
  if (fileInput.value) fileInput.value.value = ''
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
    <div v-if="!isAdmin" class="text-center py-24">
      <UIcon name="i-heroicons-lock-closed" class="w-12 h-12 text-neutral-400 mx-auto mb-4" />
      <h1 class="text-2xl font-display text-neutral-700 dark:text-neutral-100 mb-2">
        Access Denied
      </h1>
      <p class="text-neutral-500 dark:text-neutral-400">
        This page is restricted.
      </p>
    </div>

    <template v-else>
      <div class="mb-8">
        <div class="flex items-center gap-2 mb-1">
          <UBadge color="warning" variant="subtle" label="Admin" />
          <h1 class="text-2xl font-display text-neutral-700 dark:text-neutral-100">
            Import Recipes for User
          </h1>
        </div>
        <p class="text-neutral-500 dark:text-neutral-400 mt-1">
          Import recipes onto any user's account. Recipes are published immediately.
        </p>
      </div>

      <!-- Import Result -->
      <div
        v-if="importResult"
        class="mb-8 p-6 rounded-xl"
        :class="importResult.failed === 0 ? 'bg-sage-100 dark:bg-sage-900/30' : 'bg-butter-100 dark:bg-butter-900/30'"
      >
        <div class="flex items-center gap-3 mb-4">
          <UIcon
            :name="importResult.failed === 0 ? 'i-heroicons-check-circle' : 'i-heroicons-exclamation-triangle'"
            class="w-6 h-6"
            :class="importResult.failed === 0 ? 'text-sage-600 dark:text-sage-400' : 'text-butter-600 dark:text-butter-400'"
          />
          <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">
            Import Complete — {{ importResult.successful }}/{{ importResult.total }} succeeded
          </h2>
        </div>

        <div class="space-y-2 max-h-64 overflow-y-auto">
          <div
            v-for="(result, index) in importResult.results"
            :key="index"
            class="flex items-center justify-between p-2 bg-white dark:bg-neutral-800 rounded-lg"
          >
            <div class="flex items-center gap-2">
              <UIcon
                :name="result.success ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
                class="w-4 h-4"
                :class="result.success ? 'text-sage-500' : 'text-terracotta-500'"
              />
              <span class="text-neutral-700 dark:text-neutral-100">{{ result.title }}</span>
            </div>
            <span v-if="result.error" class="text-sm text-terracotta-500">{{ result.error }}</span>
          </div>
        </div>

        <div class="mt-4 flex gap-2">
          <UButton color="primary" @click="reset">
            Import More
          </UButton>
        </div>
      </div>

      <!-- Form -->
      <template v-else>
        <!-- Target user -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-100 mb-2">
            Target Username
          </label>
          <UInput
            v-model="targetUsername"
            placeholder="username"
            icon="i-heroicons-user"
            :disabled="importing"
          />
        </div>

        <!-- File upload -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-100 mb-2">
            Upload JSON File
          </label>
          <input
            ref="fileInput"
            type="file"
            accept=".json,application/json"
            class="block w-full text-sm text-neutral-500 dark:text-neutral-400
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-medium
              file:bg-primary-50 file:text-primary-700
              dark:file:bg-primary-900/30 dark:file:text-primary-300
              hover:file:bg-primary-100 dark:hover:file:bg-primary-900/50
              cursor-pointer"
            @change="handleFileSelect"
          >
        </div>

        <!-- Paste JSON -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-100 mb-2">
            Or Paste JSON
          </label>
          <textarea
            v-model="jsonContent"
            rows="12"
            class="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-100 font-mono text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder='{ "recipes": [...] }'
            @input="parseJson"
          />
        </div>

        <!-- Parse error -->
        <div
          v-if="parseError"
          class="mb-6 p-4 rounded-xl bg-terracotta-100 dark:bg-terracotta-900/30 text-terracotta-700 dark:text-terracotta-300"
        >
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5" />
            <span>{{ parseError }}</span>
          </div>
        </div>

        <!-- Import progress -->
        <div v-if="importing" class="mb-6 p-6 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">
              Importing...
            </h2>
            <span class="text-sm text-neutral-500 dark:text-neutral-400">
              {{ liveResults.length }} / {{ parsedRecipes.length }}
            </span>
          </div>
          <div class="h-3 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden mb-3">
            <div
              class="h-full bg-primary-500 transition-all duration-300 ease-out"
              :style="{ width: `${importProgress}%` }"
            />
          </div>
          <p v-if="currentlyImporting" class="text-sm text-neutral-500 dark:text-neutral-400">
            Importing: <span class="font-medium text-neutral-700 dark:text-neutral-100">{{ currentlyImporting }}</span>
          </p>
          <div v-if="liveResults.length > 0" class="space-y-2 max-h-48 overflow-y-auto mt-3">
            <div
              v-for="(result, index) in liveResults"
              :key="index"
              class="flex items-center justify-between p-2 bg-white dark:bg-neutral-900 rounded-lg"
            >
              <div class="flex items-center gap-2">
                <UIcon
                  :name="result.success ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
                  class="w-4 h-4"
                  :class="result.success ? 'text-sage-500' : 'text-terracotta-500'"
                />
                <span class="text-sm text-neutral-700 dark:text-neutral-100">{{ result.title }}</span>
              </div>
              <span v-if="result.error" class="text-xs text-terracotta-500">{{ result.error }}</span>
            </div>
          </div>
        </div>

        <!-- Parsed preview -->
        <div v-else-if="parsedRecipes.length > 0" class="mb-6">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">
              Preview ({{ parsedRecipes.length }} recipes → @{{ targetUsername || '?' }})
            </h2>
            <UButton
              color="primary"
              :loading="importing"
              :disabled="importing || !targetUsername.trim()"
              @click="importRecipes"
            >
              Import All
            </UButton>
          </div>
          <div class="space-y-2 max-h-64 overflow-y-auto">
            <div
              v-for="(recipe, index) in parsedRecipes"
              :key="index"
              class="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg"
            >
              <div class="flex items-center justify-between">
                <span class="font-medium text-neutral-700 dark:text-neutral-100">
                  {{ recipe.title || '(untitled)' }}
                </span>
                <span class="text-sm text-neutral-500 dark:text-neutral-400">
                  {{ recipe.ingredients?.length || 0 }} ingredients, {{ recipe.instructions?.length || 0 }} steps
                </span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>
