<script setup lang="ts">
import type { ShoppingItem, ShoppingSection } from './types'
import { SECTION_ORDER } from './types'
import EditableSection from './EditableSection.vue'
import SectionManager from './SectionManager.vue'

interface Props {
  sections: ShoppingSection[]
  disabled?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:sections': [sections: ShoppingSection[]]
  addItem: [section: string, item: { item: string; amount: string; unit: string }]
  updateItem: [itemId: number, field: keyof ShoppingItem, value: string | boolean]
  deleteItem: [itemId: number]
  toggleItem: [itemId: number]
  reorderItems: [items: { id: number; sortOrder: number; section?: string }[]]
  addSection: [section: string]
}>()

// Get sections to display (all sections, including empty ones)
// Empty sections are shown so users can add items to them
const activeSections = computed(() => props.sections)

// Get available sections for adding (ones not already present)
const availableSections = computed(() => {
  const existingSections = new Set(props.sections.map(s => s.name))
  return SECTION_ORDER.filter(s => !existingSections.has(s))
})

function handleUpdateItems(sectionName: string, items: ShoppingItem[]): void {
  // When items are reordered within a section
  const updatedSections = props.sections.map(s => {
    if (s.name === sectionName) {
      return { ...s, items }
    }
    return s
  })
  emit('update:sections', updatedSections)

  // Emit reorder event
  const reorderData = items.map((item, index) => ({
    id: item.id,
    sortOrder: index,
    section: sectionName,
  }))
  emit('reorderItems', reorderData)
}

function handleAddItem(sectionName: string, item: { item: string; amount: string; unit: string }): void {
  emit('addItem', sectionName, item)
}

function handleAddSection(sectionName: string): void {
  emit('addSection', sectionName)
}
</script>

<template>
  <div>
    <!-- Existing Sections -->
    <div
      v-for="section in activeSections"
      :key="section.name"
    >
      <EditableSection
        :section="section"
        :disabled="disabled"
        @update:items="(items) => handleUpdateItems(section.name, items)"
        @add-item="(item) => handleAddItem(section.name, item)"
        @update-item="(id, field, value) => emit('updateItem', id, field, value)"
        @delete-item="(id) => emit('deleteItem', id)"
        @toggle-item="(id) => emit('toggleItem', id)"
      />
    </div>

    <!-- Add New Section -->
    <SectionManager
      :available-sections="availableSections"
      :disabled="disabled"
      @add-section="handleAddSection"
    />
  </div>
</template>
