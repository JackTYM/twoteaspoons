export interface ShoppingItem {
  id: number
  item: string
  amount: string | null
  unit: string | null
  section: string
  checked: boolean
  sortOrder: number
}

export interface ShoppingSection {
  name: string
  items: ShoppingItem[]
}

export interface ShoppingListData {
  id: number
  name: string
  createdAt: string
}

// Section configuration types
export interface SectionConfig {
  bg: string
  icon: string
  label: string
}

// Section order for sorting
export const SECTION_ORDER = [
  'produce',
  'dairy',
  'meat',
  'seafood',
  'bakery',
  'frozen',
  'pantry',
  'beverages',
  'other',
] as const

export type SectionName = (typeof SECTION_ORDER)[number]

// Section configuration
export const sectionConfig: Record<string, SectionConfig> = {
  produce: {
    bg: 'bg-sage-100 dark:bg-sage-900/30',
    icon: 'text-sage-600 dark:text-sage-400',
    label: 'Produce',
  },
  dairy: {
    bg: 'bg-butter-100 dark:bg-butter-900/30',
    icon: 'text-butter-600 dark:text-butter-400',
    label: 'Dairy & Eggs',
  },
  meat: {
    bg: 'bg-terracotta-100 dark:bg-terracotta-900/30',
    icon: 'text-terracotta-600 dark:text-terracotta-400',
    label: 'Meat & Poultry',
  },
  seafood: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    icon: 'text-blue-600 dark:text-blue-400',
    label: 'Seafood',
  },
  bakery: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    icon: 'text-amber-600 dark:text-amber-400',
    label: 'Bakery',
  },
  frozen: {
    bg: 'bg-cyan-100 dark:bg-cyan-900/30',
    icon: 'text-cyan-600 dark:text-cyan-400',
    label: 'Frozen',
  },
  pantry: {
    bg: 'bg-stone-100 dark:bg-stone-800/30',
    icon: 'text-stone-600 dark:text-stone-400',
    label: 'Pantry',
  },
  beverages: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    icon: 'text-purple-600 dark:text-purple-400',
    label: 'Beverages',
  },
  other: {
    bg: 'bg-neutral-100 dark:bg-neutral-800',
    icon: 'text-neutral-600 dark:text-neutral-400',
    label: 'Other',
  },
}

export const sectionIcons: Record<string, string> = {
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

export function getSectionConfig(sectionName: string): SectionConfig {
  return sectionConfig[sectionName] ?? sectionConfig.other!
}

export function getSectionIcon(sectionName: string): string {
  return sectionIcons[sectionName] ?? 'i-heroicons-shopping-bag'
}

export function formatItemAmount(item: ShoppingItem): string {
  if (!item.amount) return ''
  return item.unit ? `${item.amount} ${item.unit}` : item.amount
}
