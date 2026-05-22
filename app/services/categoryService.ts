import type { DbCategory } from '~/types/database'

export interface CategoryGroup {
  type: string
  label: string
  categories: DbCategory[]
}

const TYPE_LABELS: Record<string, string> = {
  meal: 'Meal Type',
  cuisine: 'Cuisine',
  dietary: 'Dietary',
  style: 'Cooking Style',
  dish: 'Dish Type',
  protein: 'Protein',
  occasion: 'Occasion',
  season: 'Season',
  other: 'Other',
}

/**
 * Service for accessing category data via the Neon Data API
 *
 * Categories are public and read-only, so no auth is required.
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useCategoryService() {
  /**
   * Get all categories ordered by type, sort_order, name
   */
  async function getAllCategories(): Promise<DbCategory[]> {
    return await $fetch('/api/categories')
  }

  /**
   * Get categories grouped by type with labels
   */
  async function getCategoriesGrouped(): Promise<CategoryGroup[]> {
    const categories = await getAllCategories()

    // Group categories by type
    const grouped = new Map<string, DbCategory[]>()
    for (const category of categories) {
      const existing = grouped.get(category.type) ?? []
      existing.push(category)
      grouped.set(category.type, existing)
    }

    // Convert to array with labels, maintaining type order
    const result: CategoryGroup[] = []
    for (const [type, cats] of grouped) {
      result.push({
        type,
        label: TYPE_LABELS[type] ?? type,
        categories: cats,
      })
    }

    return result
  }

  return {
    getAllCategories,
    getCategoriesGrouped,
  }
}
