<script setup lang="ts">
import {
  type ShoppingItem,
  type ShoppingSection,
  type SectionConfig,
  getSectionConfig,
  getSectionIcon,
  formatItemAmount,
} from './types'

interface Props {
  name: string
  sections: ShoppingSection[]
  itemCount: number
  checkedCount: number
}

const props = defineProps<Props>()

const progress = computed(() => {
  if (props.itemCount === 0) return 0
  return Math.round((props.checkedCount / props.itemCount) * 100)
})

// SVG circle calculations (radius = 48)
const circumference = 2 * Math.PI * 48
const progressOffset = computed(() => {
  return circumference - (progress.value / 100) * circumference
})

function getConfig(sectionName: string): SectionConfig {
  return getSectionConfig(sectionName)
}

function getIcon(sectionName: string): string {
  return getSectionIcon(sectionName)
}

function formatAmount(item: ShoppingItem): string {
  return formatItemAmount(item)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Preview Header -->
    <div class="relative overflow-hidden rounded-xl">
      <div class="absolute inset-0 bg-gradient-to-br from-sage-50 to-primary-50 dark:from-sage-950/30 dark:to-primary-950/30" />
      <div class="relative p-6">
        <div class="flex items-center gap-6">
          <!-- Progress ring -->
          <div class="relative w-28 h-28 flex-shrink-0">
            <svg class="w-full h-full -rotate-90">
              <circle
                cx="56"
                cy="56"
                r="48"
                stroke="currentColor"
                stroke-width="8"
                fill="none"
                class="text-neutral-200 dark:text-neutral-700"
              />
              <circle
                cx="56"
                cy="56"
                r="48"
                stroke="currentColor"
                stroke-width="8"
                fill="none"
                stroke-linecap="round"
                class="transition-all duration-700 text-primary-500"
                :stroke-dasharray="circumference"
                :stroke-dashoffset="progressOffset"
              />
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center">
              <span class="text-2xl font-bold text-neutral-700 dark:text-neutral-100">
                {{ progress }}%
              </span>
              <span class="text-xs text-neutral-500 dark:text-neutral-400">complete</span>
            </div>
          </div>

          <div class="flex-1">
            <h1 class="text-2xl font-display text-neutral-700 dark:text-neutral-100">
              {{ name || 'Untitled List' }}
            </h1>
            <p class="text-neutral-500 dark:text-neutral-400 mt-1">
              {{ checkedCount }} of {{ itemCount }} items checked
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Preview Sections -->
    <div class="space-y-6">
      <div
        v-for="section in sections"
        :key="section.name"
        class="mb-6"
      >
        <!-- Section Header -->
        <div class="flex items-center gap-3 mb-3">
          <div
            class="w-10 h-10 rounded-xl flex items-center justify-center"
            :class="getConfig(section.name).bg"
          >
            <UIcon
              :name="getIcon(section.name)"
              class="w-5 h-5"
              :class="getConfig(section.name).icon"
            />
          </div>
          <div>
            <h2 class="font-semibold text-neutral-700 dark:text-neutral-100">
              {{ getConfig(section.name).label }}
            </h2>
            <p class="text-sm text-neutral-500 dark:text-neutral-400">
              {{ section.items.filter((i: ShoppingItem) => i.checked).length }} / {{ section.items.length }} items
            </p>
          </div>
        </div>

        <!-- Items -->
        <div class="space-y-2 ml-[52px]">
          <div
            v-for="item in section.items"
            :key="item.id"
            class="flex items-center gap-3 p-3 rounded-lg"
            :class="item.checked ? 'bg-neutral-100 dark:bg-neutral-800/50' : 'bg-white dark:bg-neutral-800'"
          >
            <div
              class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
              :class="item.checked ? 'bg-sage-500 border-2 border-sage-500' : 'border-2 border-neutral-300 dark:border-neutral-600'"
            >
              <UIcon
                v-if="item.checked"
                name="i-heroicons-check"
                class="w-4 h-4 text-white"
              />
            </div>
            <span
              class="flex-1"
              :class="item.checked ? 'line-through text-neutral-400 dark:text-neutral-500' : 'text-neutral-700 dark:text-neutral-100'"
            >
              {{ item.item }}
            </span>
            <span
              v-if="item.amount"
              class="text-sm flex-shrink-0"
              :class="item.checked ? 'text-neutral-400 dark:text-neutral-500' : 'text-neutral-500 dark:text-neutral-400'"
            >
              {{ formatAmount(item) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="sections.length === 0"
      class="text-center py-16 bg-neutral-100 dark:bg-neutral-800 rounded-xl"
    >
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
        <UIcon
          name="i-heroicons-shopping-bag"
          class="w-8 h-8 text-neutral-400"
        />
      </div>
      <h2 class="text-xl font-display text-neutral-700 dark:text-neutral-100 mb-2">
        No items yet
      </h2>
      <p class="text-neutral-500 dark:text-neutral-400">
        Add items in the Edit tab
      </p>
    </div>
  </div>
</template>
