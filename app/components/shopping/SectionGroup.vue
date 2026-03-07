<script setup lang="ts">
interface ShoppingItem {
  id: number
  item: string
  amount: string | null
  unit: string | null
  section: string
  checked: boolean
}

interface Section {
  name: string
  items: ShoppingItem[]
}

interface Props {
  section: Section
}

const props = defineProps<Props>()

const emit = defineEmits<{
  toggle: [item: ShoppingItem]
}>()

const collapsed = ref(false)

// Section configuration
interface SectionConfig {
  bg: string
  icon: string
  label: string
}

const sectionConfig: Record<string, SectionConfig> = {
  produce: { bg: 'bg-sage-100 dark:bg-sage-900/30', icon: 'text-sage-600 dark:text-sage-400', label: 'Produce' },
  dairy: { bg: 'bg-butter-100 dark:bg-butter-900/30', icon: 'text-butter-600 dark:text-butter-400', label: 'Dairy & Eggs' },
  meat: { bg: 'bg-terracotta-100 dark:bg-terracotta-900/30', icon: 'text-terracotta-600 dark:text-terracotta-400', label: 'Meat & Poultry' },
  seafood: { bg: 'bg-blue-100 dark:bg-blue-900/30', icon: 'text-blue-600 dark:text-blue-400', label: 'Seafood' },
  bakery: { bg: 'bg-amber-100 dark:bg-amber-900/30', icon: 'text-amber-600 dark:text-amber-400', label: 'Bakery' },
  frozen: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', icon: 'text-cyan-600 dark:text-cyan-400', label: 'Frozen' },
  pantry: { bg: 'bg-stone-100 dark:bg-stone-800/30', icon: 'text-stone-600 dark:text-stone-400', label: 'Pantry' },
  beverages: { bg: 'bg-purple-100 dark:bg-purple-900/30', icon: 'text-purple-600 dark:text-purple-400', label: 'Beverages' },
  other: { bg: 'bg-neutral-100 dark:bg-neutral-800', icon: 'text-neutral-600 dark:text-neutral-400', label: 'Other' },
}

const sectionIcons: Record<string, string> = {
  produce: 'i-heroicons-sparkles',
  dairy: 'i-heroicons-beaker',
  meat: 'i-heroicons-fire',
  seafood: 'i-heroicons-sparkles',
  bakery: 'i-heroicons-cake',
  frozen: 'i-heroicons-cube-transparent',
  pantry: 'i-heroicons-cube',
  beverages: 'i-heroicons-beaker',
  other: 'i-heroicons-shopping-bag',
}

const defaultConfig: SectionConfig = {
  bg: 'bg-neutral-100 dark:bg-neutral-800',
  icon: 'text-neutral-600 dark:text-neutral-400',
  label: 'Other',
}

const config = computed((): SectionConfig => {
  return sectionConfig[props.section.name] ?? defaultConfig
})

const icon = computed(() => {
  return sectionIcons[props.section.name] ?? 'i-heroicons-shopping-bag'
})

const checkedInSection = computed(() => {
  return props.section.items.filter(i => i.checked).length
})

const uncheckedItems = computed(() => {
  return props.section.items.filter(i => !i.checked)
})

const checkedItems = computed(() => {
  return props.section.items.filter(i => i.checked)
})

function formatAmount(item: ShoppingItem): string {
  if (!item.amount) return ''
  return item.unit ? `${item.amount} ${item.unit}` : item.amount
}
</script>

<template>
  <div class="mb-6">
    <button
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
        v-if="checkedInSection === section.items.length"
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

    <Transition name="collapse">
      <div
        v-if="!collapsed"
        class="space-y-2 ml-[52px]"
      >
        <!-- Unchecked items first -->
        <div
          v-for="item in uncheckedItems"
          :key="item.id"
          class="flex items-center gap-3 p-3 rounded-lg cursor-pointer bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          @click="emit('toggle', item)"
        >
          <div class="w-6 h-6 rounded-full border-2 border-neutral-300 dark:border-neutral-600 flex items-center justify-center flex-shrink-0" />
          <span class="flex-1 text-neutral-700 dark:text-neutral-100">
            {{ item.item }}
          </span>
          <span
            v-if="item.amount"
            class="text-sm text-neutral-500 dark:text-neutral-400 flex-shrink-0"
          >
            {{ formatAmount(item) }}
          </span>
        </div>

        <!-- Checked items at bottom -->
        <div
          v-for="item in checkedItems"
          :key="item.id"
          class="flex items-center gap-3 p-3 rounded-lg cursor-pointer bg-neutral-100 dark:bg-neutral-800/50 transition-colors"
          @click="emit('toggle', item)"
        >
          <div class="w-6 h-6 rounded-full bg-sage-500 border-2 border-sage-500 flex items-center justify-center flex-shrink-0">
            <UIcon
              name="i-heroicons-check"
              class="w-4 h-4 text-white"
            />
          </div>
          <span class="flex-1 line-through text-neutral-400 dark:text-neutral-500">
            {{ item.item }}
          </span>
          <span
            v-if="item.amount"
            class="text-sm text-neutral-400 dark:text-neutral-500 flex-shrink-0"
          >
            {{ formatAmount(item) }}
          </span>
        </div>
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
  max-height: 1000px;
}
</style>
