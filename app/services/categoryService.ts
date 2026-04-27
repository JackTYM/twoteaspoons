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
export function useCategoryService() {
  const { from } = useNeonData()

  /**
   * Get all categories ordered by type, sort_order, name
   */
  async function getAllCategories(): Promise<DbCategory[]> {
    const { data, error } = await from('categories')
      .select('*')
      .order('type', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('Failed to fetch categories:', error)
      return []
    }

    return data ?? []
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
