import { asc } from 'drizzle-orm'
import { db, categories } from '../../db'

interface CategoryGroup {
  type: string
  label: string
  categories: Array<{
    id: number
    name: string
    slug: string
    icon: string | null
  }>
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
}

const TYPE_ORDER = ['meal', 'cuisine', 'dietary', 'style', 'dish', 'protein', 'occasion', 'season']

export default defineEventHandler(async () => {
  const allCategories = await db
    .select()
    .from(categories)
    .orderBy(asc(categories.type), asc(categories.sortOrder))

  // Group by type
  const grouped = new Map<string, CategoryGroup>()

  for (const category of allCategories) {
    const type = category.type || 'other'
    if (!grouped.has(type)) {
      grouped.set(type, {
        type,
        label: TYPE_LABELS[type] || type.charAt(0).toUpperCase() + type.slice(1),
        categories: [],
      })
    }
    grouped.get(type)!.categories.push({
      id: category.id,
      name: category.name,
      slug: category.slug,
      icon: category.icon,
    })
  }

  // Sort groups by predefined order
  const groups = TYPE_ORDER
    .filter(type => grouped.has(type))
    .map(type => grouped.get(type)!)

  // Add any remaining types not in the predefined order
  for (const [type, group] of grouped) {
    if (!TYPE_ORDER.includes(type)) {
      groups.push(group)
    }
  }

  return {
    groups,
    total: allCategories.length,
  }
})
