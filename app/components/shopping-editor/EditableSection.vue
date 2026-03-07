<script setup lang="ts">
import draggable from 'vuedraggable'
import type { ShoppingItem, ShoppingSection } from './types'
import { getSectionConfig, getSectionIcon } from './types'
import EditableItem from './EditableItem.vue'
import AddItemInput from './AddItemInput.vue'

interface Props {
  section: ShoppingSection
  disabled?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:items': [items: ShoppingItem[]]
  addItem: [item: { item: string; amount: string; unit: string }]
  updateItem: [itemId: number, field: keyof ShoppingItem, value: string | boolean]
  deleteItem: [itemId: number]
  toggleItem: [itemId: number]
}>()

const collapsed = ref(false)
const isMounted = ref(true)

// Clean unmount to prevent vuedraggable errors
onBeforeUnmount(() => {
  isMounted.value = false
})

const config = computed(() => getSectionConfig(props.section.name))
const icon = computed(() => getSectionIcon(props.section.name))

const checkedInSection = computed(() => {
  return props.section.items.filter(i => i.checked).length
})

// Local items for draggable
const localItems = computed({
  get: () => props.section.items,
  set: (value) => emit('update:items', value),
})

function handleAddItem(item: { item: string; amount: string; unit: string }): void {
  emit('addItem', item)
}

function handleUpdateItem(itemId: number, field: keyof ShoppingItem, value: string | boolean): void {
  emit('updateItem', itemId, field, value)
}

function handleDeleteItem(itemId: number): void {
  emit('deleteItem', itemId)
}

function handleToggleItem(itemId: number): void {
  emit('toggleItem', itemId)
}
</script>

<template>
  <div class="mb-6">
    <!-- Section Header -->
    <button
      type="button"
      class="flex items-center gap-3 w-full text-left mb-3"
      :aria-expanded="!collapsed"
      :aria-label="`${config.label} section, ${checkedInSection} of ${section.items.length} items checked`"
      @click="collapsed = !collapsed"
    >
      <div
        class="w-10 h-10 rounded-xl flex items-center justify-center"
        :class="config.bg"
      >
        <UIcon
          :name="icon"
          class="w-5 h-5"
          :class="config.icon"
        />
      </div>
      <div class="flex-1">
        <h2 class="font-semibold text-neutral-700 dark:text-neutral-100">
          {{ config.label }}
        </h2>
        <p class="text-sm text-neutral-500 dark:text-neutral-400">
          {{ checkedInSection }} / {{ section.items.length }} items
        </p>
      </div>
      <div
        v-if="checkedInSection === section.items.length && section.items.length > 0"
        class="mr-2"
      >
        <UIcon
          name="i-heroicons-check-circle"
          class="w-5 h-5 text-sage-500"
        />
      </div>
      <UIcon
        name="i-heroicons-chevron-down"
        class="w-5 h-5 text-neutral-400 transition-transform"
        :class="{ 'rotate-180': collapsed }"
      />
    </button>

    <!-- Items List -->
    <Transition name="collapse">
      <div
        v-if="!collapsed"
        class="space-y-2 ml-[52px]"
      >
        <!-- Draggable Items -->
        <draggable
          v-if="isMounted"
          v-model="localItems"
          item-key="id"
          handle=".drag-handle"
          :animation="200"
          ghost-class="opacity-30"
          drag-class="shadow-lg"
          group="shopping-items"
        >
          <template #item="{ element }">
            <EditableItem
              :item="element"
              :disabled="disabled"
              @update="(field, value) => handleUpdateItem(element.id, field, value)"
              @delete="handleDeleteItem(element.id)"
              @toggle="handleToggleItem(element.id)"
            />
          </template>
        </draggable>

        <!-- Add Item Input -->
        <AddItemInput
          :placeholder="`Add to ${config.label.toLowerCase()}...`"
          :disabled="disabled"
          @add="handleAddItem"
        />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
}

.collapse-enter-to,
.collapse-leave-from {
  max-height: 2000px;
}
</style>
