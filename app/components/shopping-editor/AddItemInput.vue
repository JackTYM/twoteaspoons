<script setup lang="ts">
interface Props {
  placeholder?: string
  disabled?: boolean
}

withDefaults(defineProps<Props>(), {
  placeholder: 'Add an item...',
  disabled: false,
})

const emit = defineEmits<{
  add: [item: { item: string; amount: string; unit: string }]
}>()

const newItem = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

function handleSubmit(): void {
  const trimmed = newItem.value.trim()
  if (!trimmed) return

  // Parse input - try to extract amount and unit
  // Patterns: "2 cups flour", "1 lb chicken", "flour"
  const match = trimmed.match(/^(\d+(?:\/\d+)?(?:\.\d+)?)\s*(cup|cups|tbsp|tsp|oz|lb|g|kg|ml|L)?\s*(.+)$/i)

  if (match) {
    const [, amount, unit, item] = match
    emit('add', {
      item: (item ?? '').trim(),
      amount: amount ?? '',
      unit: normalizeUnit(unit ?? ''),
    })
  } else {
    emit('add', {
      item: trimmed,
      amount: '',
      unit: '',
    })
  }

  newItem.value = ''
}

function normalizeUnit(unit: string): string {
  const unitMap: Record<string, string> = {
    cups: 'cup',
    cup: 'cup',
    tbsp: 'tbsp',
    tsp: 'tsp',
    oz: 'oz',
    lb: 'lb',
    g: 'g',
    kg: 'kg',
    ml: 'ml',
    l: 'L',
  }
  return unitMap[unit.toLowerCase()] || ''
}

function focus(): void {
  inputRef.value?.focus()
}

defineExpose({ focus })
</script>

<template>
  <div class="flex items-center gap-2 p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg border-2 border-dashed border-neutral-300 dark:border-neutral-600 hover:border-primary-300 dark:hover:border-primary-500 transition-colors">
    <UIcon
      name="i-heroicons-plus"
      class="w-5 h-5 text-neutral-400 flex-shrink-0 ml-1"
    />
    <input
      ref="inputRef"
      v-model="newItem"
      type="text"
      :placeholder="placeholder"
      class="flex-1 px-2 py-1.5 text-sm bg-transparent border-0 focus:ring-0 placeholder-neutral-400"
      :disabled="disabled"
      @keydown.enter="handleSubmit"
    >
    <UButton
      type="button"
      color="primary"
      variant="soft"
      size="xs"
      :disabled="disabled || !newItem.trim()"
      @click="handleSubmit"
    >
      Add
    </UButton>
  </div>
</template>
