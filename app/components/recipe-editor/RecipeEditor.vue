<script setup lang="ts">
import { useAutosave } from '~/composables/useAutosave'
import { useIngredientAmountValidation, type AmountValidationResult } from '~/composables/useIngredientAmountValidation'
import EditorToolbar from './EditorToolbar.vue'
import EditableHeader from './EditableHeader.vue'
import EditableIngredients from './EditableIngredients.vue'
import EditableInstructions from './EditableInstructions.vue'
import EditableSourceAttribution from './EditableSourceAttribution.vue'
import CategoryPicker from './CategoryPicker.vue'
import PreviewPane from './PreviewPane.vue'
import AmountValidationModal from './AmountValidationModal.vue'

interface IngredientInput {
  id: string
  amount: string
  unit: string
  item: string
  notes: string
}

interface IngredientLink {
  id: number
  amount?: string | null
  unit?: string | null
}

interface InstructionInput {
  id: string
  content: string
  timerMinutes: number | null
  ingredientLinks: IngredientLink[]
}

interface CategoryInput {
  id: number
  name: string
  slug: string
  icon: string | null
  type: string
}

interface Props {
  initialData?: {
    title?: string
    description?: string
    coverPhoto?: string
    prepTime?: number
    cookTime?: number
    servings?: number
    isPublished?: boolean
    sourceUrl?: string
    sourceAuthor?: string
    sourceSite?: string
    categories?: CategoryInput[]
    ingredients?: Array<{
      id?: number
      amount?: number | string
      unit?: string
      item: string
      notes?: string
    }>
    instructions?: Array<{
      id?: number
      content: string
      timerMinutes?: number
      ingredientIds?: number[]
      ingredientLinks?: IngredientLink[]
    }>
  }
  submitLabel?: string
  loading?: boolean
  autosaveKey?: string
  mode?: 'create' | 'edit'
}

interface FormData {
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
  categoryIds: number[]
  ingredients: Omit<IngredientInput, 'id'>[]
  instructions: Omit<InstructionInput, 'id'>[]
}

const props = withDefaults(defineProps<Props>(), {
  initialData: undefined,
  submitLabel: 'Save Recipe',
  loading: false,
  autosaveKey: 'recipe',
  mode: 'create',
})

const emit = defineEmits<{
  submit: [data: FormData]
}>()

const router = useRouter()

// Validation composable
const { validateAmounts, hasValidationWarnings, getWarnings } = useIngredientAmountValidation()

// Active tab state
const activeTab = ref<'edit' | 'preview'>('edit')

// Validation modal state
const showValidationModal = ref(false)
const validationWarnings = ref<AmountValidationResult[]>([])

// Generate unique IDs
function generateId(): string {
  return crypto.randomUUID()
}

/**
 * Migrate old ingredientIds format to new ingredientLinks format
 */
function migrateIngredientLinks(instruction: {
  ingredientIds?: number[]
  ingredientLinks?: IngredientLink[]
}): IngredientLink[] {
  // If already has new format, use it
  if (instruction.ingredientLinks && instruction.ingredientLinks.length > 0) {
    return instruction.ingredientLinks
  }
  // Migrate from old format
  if (instruction.ingredientIds && instruction.ingredientIds.length > 0) {
    return instruction.ingredientIds.map((id) => ({ id }))
  }
  return []
}

// Form state
const form = reactive({
  title: props.initialData?.title || '',
  description: props.initialData?.description || '',
  coverPhoto: props.initialData?.coverPhoto || '',
  prepTime: props.initialData?.prepTime || null as number | null,
  cookTime: props.initialData?.cookTime || null as number | null,
  servings: props.initialData?.servings || 4,
  isPublished: props.initialData?.isPublished ?? true,
  sourceUrl: props.initialData?.sourceUrl || '',
  sourceAuthor: props.initialData?.sourceAuthor || '',
  sourceSite: props.initialData?.sourceSite || '',
})

// Ingredients with unique IDs
const ingredients = ref<IngredientInput[]>(
  props.initialData?.ingredients?.map((i) => ({
    id: generateId(),
    amount: String(i.amount || ''),
    unit: i.unit || '',
    item: i.item,
    notes: i.notes || '',
  })) || [{ id: generateId(), amount: '', unit: '', item: '', notes: '' }]
)

// Instructions with unique IDs - migrate from old format if needed
const instructions = ref<InstructionInput[]>(
  props.initialData?.instructions?.map((i) => ({
    id: generateId(),
    content: i.content,
    timerMinutes: i.timerMinutes || null,
    ingredientLinks: migrateIngredientLinks(i),
  })) || [{ id: generateId(), content: '', timerMinutes: null, ingredientLinks: [] }]
)

// Category IDs
const categoryIds = ref<number[]>(
  props.initialData?.categories?.map(c => c.id) || []
)

// Image upload state
const uploading = ref(false)
const uploadError = ref('')
const showCropper = ref(false)
const { getAuthHeaders } = useAuth()

// Autosave setup
const autosaveData = computed(() => ({
  form: { ...form },
  ingredients: ingredients.value,
  instructions: instructions.value,
  categoryIds: categoryIds.value,
}))

const { status: autosaveStatus, loadDraft, clearDraft, hasDraft } = useAutosave(
  autosaveData,
  props.autosaveKey
)

// Show draft recovery prompt (only in create mode, not edit mode)
const showDraftPrompt = ref(false)
onMounted(() => {
  if (props.mode === 'create' && hasDraft.value && !props.initialData?.title) {
    showDraftPrompt.value = true
  }
})

function recoverDraft(): void {
  const draft = loadDraft()
  if (draft) {
    Object.assign(form, draft.form)
    ingredients.value = draft.ingredients
    // Ensure all instructions have ingredientLinks (backwards compatibility with old drafts)
    instructions.value = draft.instructions.map((i: InstructionInput & { ingredientIds?: number[] }) => ({
      ...i,
      ingredientLinks: migrateIngredientLinks(i),
    }))
    // Restore categories
    if (draft.categoryIds) {
      categoryIds.value = draft.categoryIds
    }
  }
  showDraftPrompt.value = false
}

function discardDraft(): void {
  clearDraft()
  showDraftPrompt.value = false
}

// Form completion progress
const completionPercent = computed(() => {
  let filled = 0
  const total = 5
  if (form.title) filled++
  if (form.coverPhoto) filled++
  if (ingredients.value.some(i => i.item.trim())) filled++
  if (instructions.value.some(i => i.content.trim())) filled++
  if (form.prepTime || form.cookTime) filled++
  return Math.round((filled / total) * 100)
})

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

// Ingredients management
function addIngredient(): void {
  ingredients.value.push({ id: generateId(), amount: '', unit: '', item: '', notes: '' })
}

function updateIngredient(index: number, ingredient: IngredientInput): void {
  ingredients.value[index] = ingredient
}

function removeIngredient(index: number): void {
  if (ingredients.value.length > 1) {
    ingredients.value.splice(index, 1)
  }
}

// Instructions management
function addInstruction(): void {
  instructions.value.push({ id: generateId(), content: '', timerMinutes: null, ingredientLinks: [] })
}

function updateInstruction(index: number, instruction: InstructionInput): void {
  instructions.value[index] = instruction
}

function removeInstruction(index: number): void {
  if (instructions.value.length > 1) {
    instructions.value.splice(index, 1)
  }
}

// Update ingredient links for a specific instruction
function updateInstructionIngredientLinks(index: number, ingredientLinks: IngredientLink[]): void {
  const instruction = instructions.value[index]
  if (!instruction) return
  instructions.value[index] = {
    ...instruction,
    ingredientLinks,
  }
}

// Computed recipe data for preview
const previewRecipe = computed(() => ({
  id: 0,
  userId: '',
  title: form.title || 'Untitled Recipe',
  slug: '',
  description: form.description,
  coverPhoto: form.coverPhoto,
  prepTime: form.prepTime,
  cookTime: form.cookTime,
  servings: form.servings,
  isPublished: form.isPublished,
  sourceUrl: form.sourceUrl,
  sourceAuthor: form.sourceAuthor,
  sourceSite: form.sourceSite,
  forkedFromId: null,
  avgTasteRating: null,
  avgDifficultyRating: null,
  ratingCount: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  author: {
    id: '',
    email: '',
    name: 'You',
    username: null,
    avatar: null,
    bio: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  ingredients: ingredients.value
    .filter(i => i.item.trim())
    .map((i, index) => ({
      id: index + 1,
      recipeId: 0,
      amount: i.amount || null,
      unit: i.unit || null,
      item: i.item,
      notes: i.notes || null,
      sortOrder: index,
    })),
  instructions: instructions.value
    .filter(i => i.content.trim())
    .map((i, index) => ({
      id: index + 1,
      recipeId: 0,
      stepNumber: index + 1,
      content: i.content,
      timerMinutes: i.timerMinutes,
      photo: null,
      // Include both formats for compatibility
      ingredientIds: i.ingredientLinks.map(l => l.id),
      ingredientLinks: i.ingredientLinks,
    })),
}))

// Prepare data for submission
function prepareFormData(): FormData {
  return {
    ...form,
    categoryIds: categoryIds.value,
    ingredients: ingredients.value
      .filter(i => i.item.trim())
      .map(({ id: _id, ...rest }) => rest),
    instructions: instructions.value
      .filter(i => i.content.trim())
      .map(({ id: _id, ...rest }) => rest),
  }
}

// Validate and submit
function handleSubmit(): void {
  // Run validation
  const results = validateAmounts(ingredients.value, instructions.value)
  const warnings = getWarnings(results)

  if (hasValidationWarnings(results)) {
    // Show validation modal with warnings
    validationWarnings.value = warnings
    showValidationModal.value = true
  } else {
    // No warnings, proceed with save
    doSubmit()
  }
}

// Actually submit the data
function doSubmit(): void {
  const data = prepareFormData()
  emit('submit', data)
  clearDraft()
}

// Handle "Save anyway" from validation modal
function handleSaveAnyway(): void {
  showValidationModal.value = false
  doSubmit()
}

// Handle "Fix amounts" from validation modal
function handleFixAmounts(): void {
  // Just close modal - user will fix manually
  showValidationModal.value = false
}

function handleCancel(): void {
  router.back()
}

// Expose for parent components
defineExpose({
  form,
  ingredients,
  instructions,
  handleSubmit,
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
        title="Continue where you left off?"
        description="You have unsaved work from a previous editing session (stored in your browser). This hasn't been saved to your recipes yet."
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
    <EditorToolbar
      v-model:active-tab="activeTab"
      :autosave-status="autosaveStatus"
      :loading="loading"
      :submit-label="submitLabel"
      :progress="completionPercent"
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
        <!-- Editable Header (Hero, Title, Description, Metadata) -->
        <EditableHeader
          v-model:title="form.title"
          v-model:description="form.description"
          v-model:cover-photo="form.coverPhoto"
          v-model:prep-time="form.prepTime"
          v-model:cook-time="form.cookTime"
          v-model:servings="form.servings"
          v-model:is-published="form.isPublished"
          :uploading="uploading"
          :upload-error="uploadError"
          @open-cropper="openCropper"
          @remove-image="removeImage"
        />

        <!-- Categories -->
        <div class="mt-6 p-4 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <CategoryPicker v-model="categoryIds" />
        </div>

        <!-- Main Content Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Ingredients Sidebar -->
          <div class="lg:col-span-1 lg:order-1">
            <EditableIngredients
              v-model:ingredients="ingredients"
              @add="addIngredient"
              @update="updateIngredient"
              @remove="removeIngredient"
            />
          </div>

          <!-- Instructions Main -->
          <div class="lg:col-span-2 lg:order-2">
            <EditableInstructions
              v-model:instructions="instructions"
              :ingredients="ingredients"
              @add="addInstruction"
              @update="updateInstruction"
              @remove="removeInstruction"
              @update-ingredient-links="updateInstructionIngredientLinks"
            />
          </div>
        </div>

        <!-- Source Attribution -->
        <EditableSourceAttribution
          v-model:source-url="form.sourceUrl"
          v-model:source-author="form.sourceAuthor"
          v-model:source-site="form.sourceSite"
        />
      </div>

      <!-- Preview Mode -->
      <div v-show="activeTab === 'preview'">
        <PreviewPane
          :recipe="previewRecipe"
        />
      </div>
    </div>

    <!-- Image Cropper Modal -->
    <ImageCropper
      v-model="showCropper"
      :aspect-ratio="16 / 9"
      title="Crop Cover Photo"
      @crop="handleCroppedImage"
    />

    <!-- Amount Validation Modal -->
    <AmountValidationModal
      v-model="showValidationModal"
      :warnings="validationWarnings"
      @save-anyway="handleSaveAnyway"
      @fix-amounts="handleFixAmounts"
    />
  </div>
</template>
