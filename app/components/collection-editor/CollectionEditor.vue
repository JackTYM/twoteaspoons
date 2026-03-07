<script setup lang="ts">
import { useAutosave } from '~/composables/useAutosave'
import CollectionEditorToolbar from './CollectionEditorToolbar.vue'
import EditableCollectionHeader from './EditableCollectionHeader.vue'
import EditableRecipeGrid from './EditableRecipeGrid.vue'
import CollectionPreviewPane from './CollectionPreviewPane.vue'

interface Recipe {
  id: number
  title: string
  coverPhoto: string | null
  prepTime: number | null
  cookTime: number | null
}

interface Props {
  initialData?: {
    id?: number
    name?: string
    description?: string
    coverPhoto?: string
    isPublic?: boolean
    recipes?: Recipe[]
  }
  submitLabel?: string
  loading?: boolean
  autosaveKey?: string
  mode?: 'create' | 'edit'
}

interface FormData {
  name: string
  description: string
  coverPhoto: string
  isPublic: boolean
  recipes: Recipe[]
}

const props = withDefaults(defineProps<Props>(), {
  initialData: undefined,
  submitLabel: 'Save Cookbook',
  loading: false,
  autosaveKey: 'collection',
  mode: 'create',
})

const emit = defineEmits<{
  submit: [data: FormData]
  addRecipes: []
  removeRecipe: [recipeId: number]
  reorderRecipes: [recipes: Recipe[]]
}>()

const router = useRouter()

// Active tab state
const activeTab = ref<'edit' | 'preview'>('edit')

// Form state
const form = reactive({
  name: props.initialData?.name || '',
  description: props.initialData?.description || '',
  coverPhoto: props.initialData?.coverPhoto || '',
  isPublic: props.initialData?.isPublic ?? false,
})

// Recipes state
const recipes = ref<Recipe[]>(props.initialData?.recipes || [])

// Track if initial form setup is complete
const isInitialized = ref(false)

// Watch for initialData changes (for edit mode)
// Only update form fields on first load, always sync recipes
watch(
  () => props.initialData,
  (newData) => {
    if (newData) {
      // Only update form fields on first initialization
      if (!isInitialized.value) {
        if (newData.name) form.name = newData.name
        if (newData.description) form.description = newData.description
        if (newData.coverPhoto) form.coverPhoto = newData.coverPhoto
        if (newData.isPublic !== undefined) form.isPublic = newData.isPublic
        isInitialized.value = true
      }
      // Always sync recipes from parent
      if (newData.recipes) {
        recipes.value = newData.recipes
      }
    }
  },
  { immediate: true, deep: true }
)

// Image upload state
const uploading = ref(false)
const uploadError = ref('')
const showCropper = ref(false)
const { getAuthHeaders } = useAuth()

// Autosave setup
const autosaveData = computed(() => ({
  form: { ...form },
  recipes: recipes.value,
}))

const { status: autosaveStatus, loadDraft, clearDraft, hasDraft } = useAutosave(
  autosaveData,
  props.autosaveKey
)

// Show draft recovery prompt (only in create mode)
const showDraftPrompt = ref(false)
onMounted(() => {
  if (props.mode === 'create' && hasDraft.value && !props.initialData?.name) {
    showDraftPrompt.value = true
  }
})

function recoverDraft(): void {
  const draft = loadDraft()
  if (draft) {
    Object.assign(form, draft.form)
    recipes.value = draft.recipes || []
  }
  showDraftPrompt.value = false
}

function discardDraft(): void {
  clearDraft()
  showDraftPrompt.value = false
}

// Image handling
async function handleCroppedImage(blob: Blob): Promise<void> {
  uploading.value = true
  uploadError.value = ''

  try {
    const formData = new FormData()
    formData.append('file', blob, 'cover.jpg')

    const response = await $fetch<{ url: string }>('/api/upload', {
      method: 'POST',
      body: formData,
      headers: getAuthHeaders(),
    })

    form.coverPhoto = response.url
  } catch (err) {
    console.error('Upload failed:', err)
    uploadError.value = 'Failed to upload image'
  } finally {
    uploading.value = false
  }
}

function openCropper(): void {
  showCropper.value = true
}

function removeImage(): void {
  form.coverPhoto = ''
}

// Recipe management
function handleAddRecipes(): void {
  emit('addRecipes')
}

function handleRemoveRecipe(recipeId: number): void {
  emit('removeRecipe', recipeId)
}

function handleReorderRecipes(reorderedRecipes: Recipe[]): void {
  recipes.value = reorderedRecipes
  emit('reorderRecipes', reorderedRecipes)
}

// Submit handler - don't clear draft here, parent will call clearDraft on success
function handleSubmit(): void {
  const data: FormData = {
    ...form,
    recipes: recipes.value,
  }
  emit('submit', data)
}

function handleCancel(): void {
  router.back()
}

// Expose for parent to update recipes
function updateRecipes(newRecipes: Recipe[]): void {
  recipes.value = newRecipes
}

defineExpose({
  form,
  recipes,
  updateRecipes,
  handleSubmit,
  clearDraft,
})
</script>

<template>
  <div class="max-w-6xl mx-auto">
    <!-- Draft Recovery Prompt -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <UAlert
        v-if="showDraftPrompt"
        color="warning"
        icon="i-heroicons-document-duplicate"
        title="Unsaved draft found"
        description="Would you like to recover your previous draft?"
        class="mb-6"
      >
        <template #actions>
          <div class="flex gap-2">
            <UButton
              color="primary"
              size="sm"
              @click="recoverDraft"
            >
              Recover
            </UButton>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              @click="discardDraft"
            >
              Discard
            </UButton>
          </div>
        </template>
      </UAlert>
    </Transition>

    <!-- Editor Toolbar -->
    <CollectionEditorToolbar
      v-model:active-tab="activeTab"
      :autosave-status="autosaveStatus"
      :loading="loading"
      :submit-label="submitLabel"
      @save="handleSubmit"
      @cancel="handleCancel"
    />

    <!-- Tab Content -->
    <div class="mt-6 pb-24">
      <!-- Edit Mode -->
      <div
        v-show="activeTab === 'edit'"
        class="space-y-8"
      >
        <!-- Editable Header -->
        <EditableCollectionHeader
          v-model:name="form.name"
          v-model:description="form.description"
          v-model:cover-photo="form.coverPhoto"
          v-model:is-public="form.isPublic"
          :uploading="uploading"
          :upload-error="uploadError"
          @open-cropper="openCropper"
          @remove-image="removeImage"
        />

        <!-- Recipe Grid -->
        <EditableRecipeGrid
          v-model:recipes="recipes"
          @add="handleAddRecipes"
          @remove="handleRemoveRecipe"
          @reorder="handleReorderRecipes"
        />
      </div>

      <!-- Preview Mode -->
      <div v-show="activeTab === 'preview'">
        <CollectionPreviewPane
          :name="form.name"
          :description="form.description"
          :cover-photo="form.coverPhoto"
          :is-public="form.isPublic"
          :recipes="recipes"
        />
      </div>
    </div>

    <!-- Image Cropper Modal -->
    <ImageCropper
      v-model="showCropper"
      :aspect-ratio="21 / 9"
      title="Crop Cover Photo"
      @crop="handleCroppedImage"
    />
  </div>
</template>
