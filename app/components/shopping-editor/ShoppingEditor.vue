<script setup lang="ts">
import type { ShoppingItem, ShoppingSection } from './types'
import { SECTION_ORDER } from './types'
import { useAutosave } from '~/composables/useAutosave'
import { useShoppingListService } from '~/services/shoppingListService'
import ShoppingEditorToolbar from './ShoppingEditorToolbar.vue'
import EditableListHeader from './EditableListHeader.vue'
import EditableSectionList from './EditableSectionList.vue'
import ShoppingPreviewPane from './ShoppingPreviewPane.vue'

interface Props {
  listId?: number
  listSlug?: string
  initialData?: {
    name: string
    sections: ShoppingSection[]
    totalItems?: number
    checkedItems?: number
  }
  submitLabel?: string
  loading?: boolean
  autosaveKey?: string
  mode?: 'create' | 'edit'
  showAddFromRecipes?: boolean
  addedRecipeNames?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  listId: undefined,
  listSlug: undefined,
  initialData: undefined,
  submitLabel: 'Done',
  loading: false,
  autosaveKey: 'shopping-list',
  mode: 'edit',
  showAddFromRecipes: false,
  addedRecipeNames: () => [],
})

const emit = defineEmits<{
  save: []
  cancel: []
  submit: [data: { name: string; sections: ShoppingSection[] }]
  addFromRecipes: []
}>()

const router = useRouter()
const shoppingService = useShoppingListService()

// Resolved list ID for service calls (resolved from slug if needed)
const resolvedListId = ref<number | undefined>(props.listId)

// Active tab state
const activeTab = ref<'edit' | 'preview'>('edit')

// Form state
const listName = ref(props.initialData?.name || '')
const sections = ref<ShoppingSection[]>(
  props.initialData?.sections?.map(s => ({
    ...s,
    items: s.items.map(i => ({ ...i })),
  })) || []
)

// Track if initial form setup is complete
const isInitialized = ref(false)

// Computed counts
const itemCount = computed(() => sections.value.reduce((sum, s) => sum + s.items.length, 0))
const checkedCount = computed(() => sections.value.reduce((sum, s) => sum + s.items.filter(i => i.checked).length, 0))

// Loading/saving state
const saving = ref(false)

// Autosave setup for create mode
const autosaveData = computed(() => ({
  name: listName.value,
  sections: sections.value,
}))

const {
  status: localAutosaveStatus,
  loadDraft,
  clearDraft,
  hasDraft,
} = useAutosave(autosaveData, props.autosaveKey)

// Use local autosave status in create mode, server-side status in edit mode
const autosaveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')

// Sync autosave status based on mode
watch(localAutosaveStatus, (status) => {
  if (props.mode === 'create') {
    autosaveStatus.value = status
  }
})

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
    listName.value = draft.name || ''
    sections.value = draft.sections || []
  }
  showDraftPrompt.value = false
}

function discardDraft(): void {
  clearDraft()
  showDraftPrompt.value = false
}

// Watch for initial data changes (for edit mode)
watch(
  () => props.initialData,
  (newData) => {
    if (newData) {
      // Only update form fields on first initialization or always in edit mode
      if (!isInitialized.value || props.mode === 'edit') {
        listName.value = newData.name
        sections.value = newData.sections?.map(s => ({
          ...s,
          items: s.items.map(i => ({ ...i })),
        })) || []
        isInitialized.value = true
      }
    }
  },
  { immediate: true, deep: true }
)

// Resolve list ID from slug if needed (for edit mode)
async function resolveListId(): Promise<number | undefined> {
  if (resolvedListId.value) return resolvedListId.value
  if (props.listId) {
    resolvedListId.value = props.listId
    return props.listId
  }
  if (props.listSlug) {
    const list = await shoppingService.getShoppingListBySlug(props.listSlug)
    if (list) {
      resolvedListId.value = list.id
      return list.id
    }
  }
  return undefined
}

// Helper to transform DbShoppingItem to ShoppingItem
function toShoppingItem(dbItem: { id: number; item: string; amount: string | null; unit: string | null; section: string | null; checked: boolean; sort_order: number }): ShoppingItem {
  return {
    id: dbItem.id,
    item: dbItem.item,
    amount: dbItem.amount,
    unit: dbItem.unit,
    section: dbItem.section ?? 'other',
    checked: dbItem.checked,
    sortOrder: dbItem.sort_order,
  }
}

// Service-based API calls
async function updateListName(name: string): Promise<void> {
  const listId = await resolveListId()
  if (!listId) return

  autosaveStatus.value = 'saving'
  try {
    await shoppingService.updateShoppingList(listId, { name })
    autosaveStatus.value = 'saved'
    setTimeout(() => {
      if (autosaveStatus.value === 'saved') autosaveStatus.value = 'idle'
    }, 2000)
  } catch (err) {
    console.error('Failed to update list name:', err)
    autosaveStatus.value = 'error'
  }
}

async function addItem(sectionName: string, item: { item: string; amount: string; unit: string }): Promise<void> {
  const listId = await resolveListId()
  if (!listId) return

  autosaveStatus.value = 'saving'
  try {
    const newDbItem = await shoppingService.addItem(listId, {
      item: item.item,
      amount: item.amount || null,
      unit: item.unit || null,
      section: sectionName,
    })

    // Transform and add to local state
    const newItem = toShoppingItem(newDbItem)
    const section = sections.value.find(s => s.name === sectionName)
    if (section) {
      section.items.push(newItem)
    } else {
      // Create new section
      sections.value.push({
        name: sectionName,
        items: [newItem],
      })
      // Sort sections by order
      sections.value.sort((a, b) => SECTION_ORDER.indexOf(a.name as typeof SECTION_ORDER[number]) - SECTION_ORDER.indexOf(b.name as typeof SECTION_ORDER[number]))
    }

    autosaveStatus.value = 'saved'
    setTimeout(() => {
      if (autosaveStatus.value === 'saved') autosaveStatus.value = 'idle'
    }, 2000)
  } catch (err) {
    console.error('Failed to add item:', err)
    autosaveStatus.value = 'error'
  }
}

async function updateItem(itemId: number, field: keyof ShoppingItem, value: string | boolean): Promise<void> {
  // Update local state first (optimistic)
  for (const section of sections.value) {
    const item = section.items.find(i => i.id === itemId)
    if (item) {
      (item as Record<string, unknown>)[field] = value
      break
    }
  }

  autosaveStatus.value = 'saving'
  try {
    // Map camelCase field to snake_case for service
    const fieldMapping: Record<string, string> = {
      sortOrder: 'sort_order',
    }
    const dbField = fieldMapping[field] || field
    await shoppingService.updateItem(itemId, { [dbField]: value } as Record<string, unknown>)
    autosaveStatus.value = 'saved'
    setTimeout(() => {
      if (autosaveStatus.value === 'saved') autosaveStatus.value = 'idle'
    }, 2000)
  } catch (err) {
    console.error('Failed to update item:', err)
    autosaveStatus.value = 'error'
  }
}

async function deleteItem(itemId: number): Promise<void> {
  // Remove from local state first (optimistic)
  for (const section of sections.value) {
    const index = section.items.findIndex(i => i.id === itemId)
    if (index !== -1) {
      section.items.splice(index, 1)
      break
    }
  }

  autosaveStatus.value = 'saving'
  try {
    await shoppingService.deleteItem(itemId)
    autosaveStatus.value = 'saved'
    setTimeout(() => {
      if (autosaveStatus.value === 'saved') autosaveStatus.value = 'idle'
    }, 2000)
  } catch (err) {
    console.error('Failed to delete item:', err)
    autosaveStatus.value = 'error'
  }
}

async function toggleItem(itemId: number): Promise<void> {
  // Find and toggle locally first (optimistic)
  for (const section of sections.value) {
    const item = section.items.find(i => i.id === itemId)
    if (item) {
      item.checked = !item.checked
      break
    }
  }

  try {
    await shoppingService.updateItem(itemId, { checked: !sections.value.flatMap(s => s.items).find(i => i.id === itemId)?.checked })
  } catch (err) {
    // Revert on error
    for (const section of sections.value) {
      const item = section.items.find(i => i.id === itemId)
      if (item) {
        item.checked = !item.checked
        break
      }
    }
    console.error('Failed to toggle item:', err)
  }
}

async function reorderItems(items: { id: number; sortOrder: number; section?: string }[]): Promise<void> {
  if (items.length === 0) return

  const listId = await resolveListId()
  if (!listId) return

  try {
    await shoppingService.reorderItems(listId, items)
  } catch (err) {
    console.error('Failed to reorder items:', err)
  }
}

function addSection(sectionName: string): void {
  // Add empty section to local state
  if (!sections.value.find(s => s.name === sectionName)) {
    sections.value.push({
      name: sectionName,
      items: [],
    })
    // Sort sections by order
    sections.value.sort((a, b) => SECTION_ORDER.indexOf(a.name as typeof SECTION_ORDER[number]) - SECTION_ORDER.indexOf(b.name as typeof SECTION_ORDER[number]))
  }
}

// Local item ID counter for create mode (negative IDs to avoid conflicts)
let localIdCounter = -1

// Add item - local for create mode, API for edit mode
async function addItemLocal(sectionName: string, item: { item: string; amount: string; unit: string }): Promise<void> {
  const newItem: ShoppingItem = {
    id: localIdCounter--,
    item: item.item,
    amount: item.amount || null,
    unit: item.unit || null,
    section: sectionName,
    checked: false,
    sortOrder: 0,
  }

  const section = sections.value.find(s => s.name === sectionName)
  if (section) {
    newItem.sortOrder = section.items.length
    section.items.push(newItem)
  } else {
    sections.value.push({
      name: sectionName,
      items: [newItem],
    })
    sections.value.sort((a, b) => SECTION_ORDER.indexOf(a.name as typeof SECTION_ORDER[number]) - SECTION_ORDER.indexOf(b.name as typeof SECTION_ORDER[number]))
  }
}

// Update item locally for create mode
function updateItemLocal(itemId: number, field: keyof ShoppingItem, value: string | boolean): void {
  for (const section of sections.value) {
    const item = section.items.find(i => i.id === itemId)
    if (item) {
      (item as Record<string, unknown>)[field] = value
      break
    }
  }
}

// Delete item locally for create mode
function deleteItemLocal(itemId: number): void {
  for (const section of sections.value) {
    const index = section.items.findIndex(i => i.id === itemId)
    if (index !== -1) {
      section.items.splice(index, 1)
      break
    }
  }
  // Remove empty sections
  sections.value = sections.value.filter(s => s.items.length > 0)
}

// Toggle item locally for create mode
function toggleItemLocal(itemId: number): void {
  for (const section of sections.value) {
    const item = section.items.find(i => i.id === itemId)
    if (item) {
      item.checked = !item.checked
      break
    }
  }
}

// Unified handlers that dispatch to local or API based on mode
async function handleAddItem(sectionName: string, item: { item: string; amount: string; unit: string }): Promise<void> {
  if (props.mode === 'create') {
    addItemLocal(sectionName, item)
  } else {
    await addItem(sectionName, item)
  }
}

function handleUpdateItem(itemId: number, field: keyof ShoppingItem, value: string | boolean): void {
  if (props.mode === 'create') {
    updateItemLocal(itemId, field, value)
  } else {
    updateItem(itemId, field, value)
  }
}

function handleDeleteItem(itemId: number): void {
  if (props.mode === 'create') {
    deleteItemLocal(itemId)
  } else {
    deleteItem(itemId)
  }
}

function handleToggleItem(itemId: number): void {
  if (props.mode === 'create') {
    toggleItemLocal(itemId)
  } else {
    toggleItem(itemId)
  }
}

function handleReorderItems(items: { id: number; sortOrder: number; section?: string }[]): void {
  if (props.mode === 'edit') {
    reorderItems(items)
  }
  // In create mode, local state is already updated by v-model
}

// Debounced name update
let nameUpdateTimeout: ReturnType<typeof setTimeout> | null = null
function handleNameChange(name: string): void {
  listName.value = name
  if (props.mode === 'edit') {
    if (nameUpdateTimeout) clearTimeout(nameUpdateTimeout)
    nameUpdateTimeout = setTimeout(() => {
      updateListName(name)
    }, 500)
  }
  // In create mode, autosave handles it automatically
}

function handleSave(): void {
  if (props.mode === 'create') {
    emit('submit', {
      name: listName.value,
      sections: sections.value,
    })
  } else {
    emit('save')
  }
}

function handleCancel(): void {
  emit('cancel')
  router.back()
}

// Method to merge new items into sections (for adding from recipes)
function mergeSections(newSections: ShoppingSection[]): void {
  for (const newSection of newSections) {
    const existingSection = sections.value.find(s => s.name === newSection.name)
    if (existingSection) {
      // Add items to existing section
      for (const item of newSection.items) {
        existingSection.items.push({
          ...item,
          sortOrder: existingSection.items.length,
        })
      }
    } else {
      // Create new section
      sections.value.push({
        name: newSection.name,
        items: newSection.items.map((item, i) => ({ ...item, sortOrder: i })),
      })
    }
  }
  // Sort sections by standard order
  sections.value.sort((a, b) =>
    SECTION_ORDER.indexOf(a.name as typeof SECTION_ORDER[number]) -
    SECTION_ORDER.indexOf(b.name as typeof SECTION_ORDER[number])
  )
}

// Expose for parent components
defineExpose({
  listName,
  sections,
  clearDraft,
  mergeSections,
})
</script>

<template>
  <div class="max-w-2xl mx-auto">
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
    <ShoppingEditorToolbar
      v-model:active-tab="activeTab"
      :autosave-status="autosaveStatus"
      :loading="loading || saving"
      :submit-label="submitLabel"
      @save="handleSave"
      @cancel="handleCancel"
    />

    <!-- Tab Content -->
    <div class="mt-6 pb-24">
      <!-- Edit Mode -->
      <div
        v-show="activeTab === 'edit'"
        class="space-y-6"
      >
        <!-- Editable Header -->
        <EditableListHeader
          :name="listName"
          :item-count="itemCount"
          :checked-count="checkedCount"
          :mode="mode"
          @update:name="handleNameChange"
        />

        <!-- Add from Recipes (for create mode) -->
        <div
          v-if="showAddFromRecipes"
          class="bg-sage-50 dark:bg-sage-900/20 border border-sage-200 dark:border-sage-800 rounded-xl p-4"
        >
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg bg-sage-100 dark:bg-sage-900/50 flex items-center justify-center flex-shrink-0">
                <UIcon
                  name="i-heroicons-book-open"
                  class="w-4 h-4 text-sage-600 dark:text-sage-400"
                />
              </div>
              <div class="min-w-0">
                <p class="font-medium text-neutral-700 dark:text-neutral-100 text-sm">
                  Add from Recipes
                </p>
                <p class="text-xs text-neutral-500 dark:text-neutral-400">
                  Import ingredients from your recipes
                </p>
              </div>
            </div>
            <UButton
              color="primary"
              variant="soft"
              size="sm"
              icon="i-heroicons-plus"
              @click="emit('addFromRecipes')"
            >
              Add Recipe
            </UButton>
          </div>

          <!-- Added recipes badges -->
          <div
            v-if="addedRecipeNames.length > 0"
            class="mt-3 flex flex-wrap gap-2"
          >
            <span
              v-for="name in addedRecipeNames"
              :key="name"
              class="inline-flex items-center gap-1 px-2 py-0.5 bg-sage-100 dark:bg-sage-900/50 text-sage-700 dark:text-sage-300 rounded-full text-xs"
            >
              <UIcon
                name="i-heroicons-check"
                class="w-3 h-3"
              />
              <span class="truncate max-w-[150px]">{{ name }}</span>
            </span>
          </div>
        </div>

        <!-- Editable Sections -->
        <EditableSectionList
          v-model:sections="sections"
          @add-item="handleAddItem"
          @update-item="handleUpdateItem"
          @delete-item="handleDeleteItem"
          @toggle-item="handleToggleItem"
          @reorder-items="handleReorderItems"
          @add-section="addSection"
        />
      </div>

      <!-- Preview Mode -->
      <div v-show="activeTab === 'preview'">
        <ShoppingPreviewPane
          :name="listName"
          :sections="sections"
          :item-count="itemCount"
          :checked-count="checkedCount"
        />
      </div>
    </div>
  </div>
</template>
