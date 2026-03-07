<script setup lang="ts">
import draggable from 'vuedraggable'
import FormSection from '~/components/recipe-form/FormSection.vue'
import IngredientRow from '~/components/recipe-form/IngredientRow.vue'
import InstructionStep from '~/components/recipe-form/InstructionStep.vue'
import FloatingActionBar from '~/components/recipe-form/FloatingActionBar.vue'
import { useAutosave } from '~/composables/useAutosave'

interface IngredientInput {
  id: string
  amount: string
  unit: string
  item: string
  notes: string
}

interface InstructionInput {
  id: string
  content: string
  timerMinutes: number | null
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
    ingredients?: Array<{
      amount?: number | string
      unit?: string
      item: string
      notes?: string
    }>
    instructions?: Array<{
      content: string
      timerMinutes?: number
    }>
  }
  submitLabel?: string
  loading?: boolean
  autosaveKey?: string
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
  ingredients: Omit<IngredientInput, 'id'>[]
  instructions: Omit<InstructionInput, 'id'>[]
}

const props = withDefaults(defineProps<Props>(), {
  initialData: undefined,
  submitLabel: 'Save Recipe',
  loading: false,
  autosaveKey: 'recipe',
})

const emit = defineEmits<{
  submit: [data: FormData]
}>()

const router = useRouter()

// Generate unique IDs
function generateId(): string {
  return crypto.randomUUID()
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
  props.initialData?.ingredients?.map(i => ({
    id: generateId(),
    amount: String(i.amount || ''),
    unit: i.unit || '',
    item: i.item,
    notes: i.notes || '',
  })) || [{ id: generateId(), amount: '', unit: '', item: '', notes: '' }]
)

// Instructions with unique IDs
const instructions = ref<InstructionInput[]>(
  props.initialData?.instructions?.map(i => ({
    id: generateId(),
    content: i.content,
    timerMinutes: i.timerMinutes || null,
  })) || [{ id: generateId(), content: '', timerMinutes: null }]
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
}))

const { status: autosaveStatus, loadDraft, clearDraft, hasDraft } = useAutosave(
  autosaveData,
  props.autosaveKey
)

// Show draft recovery prompt
const showDraftPrompt = ref(false)
onMounted(() => {
  if (hasDraft.value && !props.initialData?.title) {
    showDraftPrompt.value = true
  }
})

function recoverDraft(): void {
  const draft = loadDraft()
  if (draft) {
    Object.assign(form, draft.form)
    ingredients.value = draft.ingredients
    instructions.value = draft.instructions
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
  instructions.value.push({ id: generateId(), content: '', timerMinutes: null })
}

function updateInstruction(index: number, instruction: InstructionInput): void {
  instructions.value[index] = instruction
}

function removeInstruction(index: number): void {
  if (instructions.value.length > 1) {
    instructions.value.splice(index, 1)
  }
}

// Submit handler - strips IDs for backwards compatibility
function handleSubmit(): void {
  const data: FormData = {
    ...form,
    ingredients: ingredients.value
      .filter(i => i.item.trim())
      .map(({ id: _id, ...rest }) => rest),
    instructions: instructions.value
      .filter(i => i.content.trim())
      .map(({ id: _id, ...rest }) => rest),
  }
  emit('submit', data)
  clearDraft()
}

function handleCancel(): void {
  router.back()
}
</script>

<template>
  <div>
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

    <form
      class="space-y-6 pb-24"
      @submit.prevent="handleSubmit"
    >
      <!-- Basic Information Section -->
      <FormSection
        title="Basic Information"
        icon="i-heroicons-document-text"
      >
        <div class="space-y-4">
          <UFormField
            label="Title"
            name="title"
            required
          >
            <UInput
              v-model="form.title"
              placeholder="Recipe title"
              required
            />
          </UFormField>

          <UFormField
            label="Description"
            name="description"
          >
            <UTextarea
              v-model="form.description"
              placeholder="Brief description of this recipe"
              :rows="3"
            />
          </UFormField>

          <div class="grid grid-cols-3 gap-4">
            <UFormField
              label="Prep Time (min)"
              name="prepTime"
            >
              <UInput
                v-model.number="form.prepTime"
                type="number"
                min="0"
                placeholder="15"
              />
            </UFormField>
            <UFormField
              label="Cook Time (min)"
              name="cookTime"
            >
              <UInput
                v-model.number="form.cookTime"
                type="number"
                min="0"
                placeholder="30"
              />
            </UFormField>
            <UFormField
              label="Servings"
              name="servings"
            >
              <UInput
                v-model.number="form.servings"
                type="number"
                min="1"
                placeholder="4"
              />
            </UFormField>
          </div>

          <!-- Cover Photo Upload -->
          <UFormField
            label="Cover Photo"
            name="coverPhoto"
          >
            <div
              v-if="form.coverPhoto"
              class="relative"
            >
              <img
                :src="form.coverPhoto"
                alt="Cover photo preview"
                class="w-full aspect-video object-cover rounded-lg"
              >
              <UButton
                type="button"
                color="error"
                variant="solid"
                icon="i-heroicons-x-mark"
                size="sm"
                class="absolute top-2 right-2"
                @click="removeImage"
              />
            </div>
            <div
              v-else
              class="relative"
            >
              <button
                type="button"
                class="flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed rounded-lg cursor-pointer transition-colors border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-700 hover:border-primary-400 dark:hover:border-primary-500"
                @click="openCropper"
              >
                <div
                  v-if="uploading"
                  class="flex flex-col items-center"
                >
                  <UIcon
                    name="i-heroicons-arrow-path"
                    class="w-10 h-10 text-neutral-400 animate-spin"
                  />
                  <span class="mt-2 text-sm text-neutral-500">Uploading...</span>
                </div>
                <div
                  v-else
                  class="flex flex-col items-center"
                >
                  <UIcon
                    name="i-heroicons-photo"
                    class="w-10 h-10 text-neutral-400"
                  />
                  <span class="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                    <span class="font-medium text-primary-600 dark:text-primary-400">Click to add cover photo</span>
                  </span>
                  <span class="mt-1 text-xs text-neutral-400">
                    Crop to 16:9 aspect ratio
                  </span>
                </div>
              </button>
            </div>
            <UAlert
              v-if="uploadError"
              color="error"
              icon="i-heroicons-exclamation-circle"
              :title="uploadError"
              class="mt-2"
            />
          </UFormField>

          <!-- Visibility -->
          <div class="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-700 rounded-lg">
            <div>
              <p class="font-medium text-neutral-700 dark:text-neutral-100">
                Recipe Visibility
              </p>
              <p class="text-sm text-neutral-500 dark:text-neutral-400">
                {{ form.isPublished ? 'Anyone can see this recipe' : 'Only you can see this recipe' }}
              </p>
            </div>
            <USwitch v-model="form.isPublished" />
          </div>
        </div>
      </FormSection>

      <!-- Ingredients Section -->
      <FormSection
        title="Ingredients"
        icon="i-heroicons-list-bullet"
      >
        <div class="space-y-2">
          <draggable
            v-model="ingredients"
            item-key="id"
            handle=".drag-handle"
            :animation="200"
            ghost-class="sortable-ghost"
            drag-class="sortable-drag"
            chosen-class="sortable-chosen"
          >
            <template #item="{ element, index }">
              <IngredientRow
                :ingredient="element"
                :can-delete="ingredients.length > 1"
                @update="updateIngredient(index, $event)"
                @delete="removeIngredient(index)"
              />
            </template>
          </draggable>

          <UButton
            type="button"
            variant="soft"
            color="primary"
            icon="i-heroicons-plus"
            class="mt-4"
            @click="addIngredient"
          >
            Add Ingredient
          </UButton>
        </div>
      </FormSection>

      <!-- Instructions Section -->
      <FormSection
        title="Instructions"
        icon="i-heroicons-queue-list"
      >
        <div class="space-y-2">
          <draggable
            v-model="instructions"
            item-key="id"
            handle=".drag-handle"
            :animation="200"
            ghost-class="sortable-ghost"
            drag-class="sortable-drag"
            chosen-class="sortable-chosen"
          >
            <template #item="{ element, index }">
              <InstructionStep
                :instruction="element"
                :step-number="index + 1"
                :can-delete="instructions.length > 1"
                @update="updateInstruction(index, $event)"
                @delete="removeInstruction(index)"
              />
            </template>
          </draggable>

          <UButton
            type="button"
            variant="soft"
            color="primary"
            icon="i-heroicons-plus"
            class="mt-4"
            @click="addInstruction"
          >
            Add Step
          </UButton>
        </div>
      </FormSection>

      <!-- Source Attribution Section -->
      <FormSection
        title="Source Attribution"
        icon="i-heroicons-link"
        collapsible
        :initially-collapsed="!initialData?.sourceUrl"
      >
        <div class="space-y-4">
          <UFormField
            label="Source URL"
            name="sourceUrl"
          >
            <UInput
              v-model="form.sourceUrl"
              type="url"
              placeholder="https://..."
            />
          </UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UFormField
              label="Author"
              name="sourceAuthor"
            >
              <UInput
                v-model="form.sourceAuthor"
                placeholder="Recipe author"
              />
            </UFormField>
            <UFormField
              label="Site"
              name="sourceSite"
            >
              <UInput
                v-model="form.sourceSite"
                placeholder="Website name"
              />
            </UFormField>
          </div>
        </div>
      </FormSection>

      <!-- Floating Action Bar -->
      <FloatingActionBar
        :loading="loading"
        :autosave-status="autosaveStatus"
        :submit-label="submitLabel"
        :show-progress="true"
        :progress="completionPercent"
        @cancel="handleCancel"
        @submit="handleSubmit"
      />
    </form>

    <!-- Image Cropper Modal -->
    <ImageCropper
      v-model="showCropper"
      :aspect-ratio="16 / 9"
      title="Crop Cover Photo"
      @crop="handleCroppedImage"
    />
  </div>
</template>
