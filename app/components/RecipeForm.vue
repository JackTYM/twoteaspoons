<script setup lang="ts">
interface IngredientInput {
  amount: string
  unit: string
  item: string
  notes: string
}

interface InstructionInput {
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
  ingredients: IngredientInput[]
  instructions: InstructionInput[]
}

const props = withDefaults(defineProps<Props>(), {
  initialData: undefined,
  submitLabel: 'Save Recipe',
  loading: false,
})

const emit = defineEmits<{
  submit: [data: FormData]
}>()

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

// Image upload state
const uploading = ref(false)
const uploadError = ref('')
const isDragging = ref(false)

async function handleImageUpload(file: File): Promise<void> {
  if (!file.type.startsWith('image/')) {
    uploadError.value = 'Please upload an image file'
    return
  }

  if (file.size > 10 * 1024 * 1024) {
    uploadError.value = 'Image must be less than 10MB'
    return
  }

  uploading.value = true
  uploadError.value = ''

  try {
    const formData = new FormData()
    formData.append('file', file)

    const response = await $fetch<{ url: string }>('/api/upload', {
      method: 'POST',
      body: formData,
    })

    form.coverPhoto = response.url
  } catch (err) {
    console.error('Upload failed:', err)
    uploadError.value = 'Failed to upload image'
  } finally {
    uploading.value = false
  }
}

function handleDrop(event: DragEvent): void {
  event.preventDefault()
  isDragging.value = false

  const file = event.dataTransfer?.files[0]
  if (file) {
    handleImageUpload(file)
  }
}

function handleDragOver(event: DragEvent): void {
  event.preventDefault()
  isDragging.value = true
}

function handleDragLeave(): void {
  isDragging.value = false
}

function handleFileSelect(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    handleImageUpload(file)
  }
}

function removeImage(): void {
  form.coverPhoto = ''
}

// Ingredients
const ingredients = ref<IngredientInput[]>(
  props.initialData?.ingredients?.map(i => ({
    amount: String(i.amount || ''),
    unit: i.unit || '',
    item: i.item,
    notes: i.notes || '',
  })) || [{ amount: '', unit: '', item: '', notes: '' }]
)

function addIngredient(): void {
  ingredients.value.push({ amount: '', unit: '', item: '', notes: '' })
}

function removeIngredient(index: number): void {
  if (ingredients.value.length > 1) {
    ingredients.value.splice(index, 1)
  }
}

// Instructions
const instructions = ref<InstructionInput[]>(
  props.initialData?.instructions?.map(i => ({
    content: i.content,
    timerMinutes: i.timerMinutes || null,
  })) || [{ content: '', timerMinutes: null }]
)

function addInstruction(): void {
  instructions.value.push({ content: '', timerMinutes: null })
}

function removeInstruction(index: number): void {
  if (instructions.value.length > 1) {
    instructions.value.splice(index, 1)
  }
}

// Common units
const unitOptions = [
  { value: '', label: 'unit' },
  { value: 'tsp', label: 'tsp' },
  { value: 'tbsp', label: 'tbsp' },
  { value: 'cup', label: 'cup' },
  { value: 'oz', label: 'oz' },
  { value: 'lb', label: 'lb' },
  { value: 'g', label: 'g' },
  { value: 'kg', label: 'kg' },
  { value: 'ml', label: 'ml' },
  { value: 'L', label: 'L' },
  { value: 'piece', label: 'piece' },
  { value: 'slice', label: 'slice' },
  { value: 'clove', label: 'clove' },
  { value: 'can', label: 'can' },
  { value: 'bunch', label: 'bunch' },
  { value: 'pinch', label: 'pinch' },
]

// Source section
const showSource = ref(!!props.initialData?.sourceUrl)

// Submit
function handleSubmit(): void {
  const data: FormData = {
    ...form,
    ingredients: ingredients.value.filter(i => i.item.trim()),
    instructions: instructions.value.filter(i => i.content.trim()),
  }
  emit('submit', data)
}
</script>

<template>
  <form
    class="space-y-8"
    @submit.prevent="handleSubmit"
  >
    <!-- Basic Info -->
    <div class="space-y-4">
      <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">
        Basic Information
      </h2>

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
            class="w-full h-48 object-cover rounded-lg"
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
          @drop="handleDrop"
          @dragover="handleDragOver"
          @dragleave="handleDragLeave"
        >
          <label
            class="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors"
            :class="[
              isDragging
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800'
            ]"
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
                <span class="font-medium text-primary-600 dark:text-primary-400">Click to upload</span>
                or drag and drop
              </span>
              <span class="mt-1 text-xs text-neutral-400">
                PNG, JPG, WebP up to 10MB
              </span>
            </div>
            <input
              type="file"
              class="hidden"
              accept="image/*"
              :disabled="uploading"
              @change="handleFileSelect"
            >
          </label>
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
      <div class="flex items-center justify-between p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
        <div>
          <p class="font-medium text-neutral-700 dark:text-neutral-100">
            Recipe Visibility
          </p>
          <p class="text-sm text-neutral-500 dark:text-neutral-400">
            {{ form.isPublished ? 'Anyone can see this recipe' : 'Only you can see this recipe' }}
          </p>
        </div>
        <UToggle v-model="form.isPublished" />
      </div>
    </div>

    <!-- Ingredients -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">
          Ingredients
        </h2>
        <UButton
          type="button"
          size="sm"
          variant="outline"
          icon="i-heroicons-plus"
          @click="addIngredient"
        >
          Add
        </UButton>
      </div>

      <div
        v-for="(ingredient, index) in ingredients"
        :key="index"
        class="flex gap-2 items-start"
      >
        <UInput
          v-model="ingredient.amount"
          placeholder="1"
          class="w-20"
        />
        <USelect
          v-model="ingredient.unit"
          :options="unitOptions"
          value-key="value"
          class="w-28"
        />
        <UInput
          v-model="ingredient.item"
          placeholder="Ingredient name"
          class="flex-1"
        />
        <UInput
          v-model="ingredient.notes"
          placeholder="notes"
          class="w-32 hidden sm:block"
        />
        <UButton
          type="button"
          color="error"
          variant="ghost"
          icon="i-heroicons-x-mark"
          :disabled="ingredients.length === 1"
          @click="removeIngredient(index)"
        />
      </div>
    </div>

    <!-- Instructions -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">
          Instructions
        </h2>
        <UButton
          type="button"
          size="sm"
          variant="outline"
          icon="i-heroicons-plus"
          @click="addInstruction"
        >
          Add Step
        </UButton>
      </div>

      <div
        v-for="(instruction, index) in instructions"
        :key="index"
        class="flex gap-3 items-start"
      >
        <span class="flex-shrink-0 w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 flex items-center justify-center font-semibold text-sm">
          {{ index + 1 }}
        </span>
        <div class="flex-1 space-y-2">
          <UTextarea
            v-model="instruction.content"
            placeholder="Describe this step..."
            :rows="2"
          />
          <UFormField
            label="Timer (minutes)"
            class="w-32"
          >
            <UInput
              v-model.number="instruction.timerMinutes"
              type="number"
              min="0"
              placeholder="0"
            />
          </UFormField>
        </div>
        <UButton
          type="button"
          color="error"
          variant="ghost"
          icon="i-heroicons-x-mark"
          :disabled="instructions.length === 1"
          @click="removeInstruction(index)"
        />
      </div>
    </div>

    <!-- Source (optional) -->
    <div class="space-y-4">
      <UButton
        type="button"
        variant="ghost"
        color="neutral"
        class="w-full justify-between"
        @click="showSource = !showSource"
      >
        Source Attribution (optional)
        <template #trailing>
          <UIcon
            :name="showSource ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
            class="w-4 h-4"
          />
        </template>
      </UButton>

      <div
        v-if="showSource"
        class="space-y-4 pl-4 border-l-2 border-neutral-200 dark:border-neutral-700"
      >
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
    </div>

    <!-- Submit -->
    <div class="flex justify-end gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
      <UButton
        type="button"
        color="neutral"
        variant="outline"
        @click="$router.back()"
      >
        Cancel
      </UButton>
      <UButton
        type="submit"
        color="primary"
        :loading="loading"
      >
        {{ submitLabel }}
      </UButton>
    </div>
  </form>
</template>
