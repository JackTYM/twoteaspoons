<script setup lang="ts">
export type SortOption = 'newest' | 'oldest' | 'a-z' | 'z-a' | 'cook-time' | 'prep-time' | 'most-saved'

const model = defineModel<SortOption>({ default: 'newest' })

const sortOptions: Array<{ value: SortOption; label: string; icon: string }> = [
  { value: 'most-saved', label: 'Most Saved', icon: 'i-heroicons-bookmark' },
  { value: 'newest', label: 'Newest First', icon: 'i-heroicons-arrow-down' },
  { value: 'oldest', label: 'Oldest First', icon: 'i-heroicons-arrow-up' },
  { value: 'a-z', label: 'A to Z', icon: 'i-heroicons-bars-arrow-down' },
  { value: 'z-a', label: 'Z to A', icon: 'i-heroicons-bars-arrow-up' },
  { value: 'cook-time', label: 'Quickest', icon: 'i-heroicons-clock' },
  { value: 'prep-time', label: 'Least Prep', icon: 'i-heroicons-clock' },
]

const currentOption = computed(() => sortOptions.find(o => o.value === model.value))

const menuItems = computed(() => [
  sortOptions.map(option => ({
    label: option.label,
    icon: option.icon,
    onSelect: (): void => { model.value = option.value },
    active: model.value === option.value,
  })),
])
</script>

<template>
  <UDropdownMenu :items="menuItems">
    <UButton
      color="neutral"
      variant="outline"
      class="press-effect"
    >
      <UIcon
        :name="currentOption?.icon || 'i-heroicons-arrows-up-down'"
        class="w-4 h-4"
      />
      <span class="hidden sm:inline">{{ currentOption?.label || 'Sort' }}</span>
      <UIcon
        name="i-heroicons-chevron-down"
        class="w-4 h-4"
      />
    </UButton>
  </UDropdownMenu>
</template>
