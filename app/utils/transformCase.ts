/**
 * Utilities for transforming between snake_case (database) and camelCase (UI)
 */

import type { RecipeWithDetails } from '~/services/recipeService'
import type { CategoryGroup } from '~/services/categoryService'
import type { DbCategory } from '~/types/database'
import type { RecipeWithRelations, Ingredient, Instruction, RecipeCategory, User } from '~/types/recipe'

/**
 * Convert a snake_case string to camelCase
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * Convert a camelCase string to snake_case
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}

/**
 * Transform object keys from snake_case to camelCase (shallow)
 */
export function keysSnakeToCamel<T extends Record<string, unknown>>(
  obj: T
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(obj)) {
    result[snakeToCamel(key)] = obj[key]
  }
  return result
}

/**
 * Transform object keys from camelCase to snake_case (shallow)
 */
export function keysCamelToSnake<T extends Record<string, unknown>>(
  obj: T
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(obj)) {
    result[camelToSnake(key)] = obj[key]
  }
  return result
}

export interface UIRecipe {
  id: number
  userId: string
  slug: string
  title: string
  description: string | null
  coverPhoto: string | null
  prepTime: number | null
  cookTime: number | null
  servings: number | null
  isPublished: boolean
  sourceUrl: string | null
  sourceAuthor: string | null
  sourceSite: string | null
  forkedFromId: number | null
  avgTasteRating: string | null
  avgDifficultyRating: string | null
  ratingCount: number | null
  saveCount: number | null
  createdAt: string
  updatedAt: string
  author: { id: string; name: string; username: string | null; avatar: string | null } | null
  ingredients: Array<{
    id: number
    recipeId: number
    amount: string | null
    unit: string | null
    item: string
    notes: string | null
    sortOrder: number
  }>
  instructions: Array<{
    id: number
    recipeId: number
    stepNumber: number
    content: string
    timerMinutes: number | null
    photo: string | null
    ingredientIds: string | null
  }>
  categories: DbCategory[]
  isSaved?: boolean
}

/**
 * Transform a RecipeWithDetails (snake_case from service) to UI recipe (camelCase)
 */
export function transformRecipeToUI(recipe: RecipeWithDetails): UIRecipe {
  return {
    id: recipe.id,
    userId: recipe.user_id,
    slug: recipe.slug,
    title: recipe.title,
    description: recipe.description,
    coverPhoto: recipe.cover_photo,
    prepTime: recipe.prep_time,
    cookTime: recipe.cook_time,
    servings: recipe.servings,
    isPublished: recipe.is_published,
    sourceUrl: recipe.source_url,
    sourceAuthor: recipe.source_author,
    sourceSite: recipe.source_site,
    forkedFromId: recipe.forked_from_id,
    avgTasteRating: recipe.avg_taste_rating,
    avgDifficultyRating: recipe.avg_difficulty_rating,
    ratingCount: recipe.rating_count,
    saveCount: recipe.save_count,
    createdAt: recipe.created_at,
    updatedAt: recipe.updated_at,
    author: recipe.author,
    ingredients: recipe.ingredients.map((ing) => ({
      id: ing.id,
      recipeId: ing.recipe_id,
      amount: ing.amount,
      unit: ing.unit,
      item: ing.item,
      notes: ing.notes,
      sortOrder: ing.sort_order,
    })),
    instructions: recipe.instructions.map((inst) => ({
      id: inst.id,
      recipeId: inst.recipe_id,
      stepNumber: inst.step_number,
      content: inst.content,
      timerMinutes: inst.timer_minutes,
      photo: inst.photo,
      ingredientIds: inst.ingredient_ids,
    })),
    categories: recipe.categories,
    isSaved: recipe.is_saved,
  }
}

/**
 * Transform multiple recipes to UI format
 */
export function transformRecipesToUI(recipes: RecipeWithDetails[]): UIRecipe[] {
  return recipes.map(transformRecipeToUI)
}

export interface UICategoryGroup {
  type: string
  label: string
  categories: Array<{
    id: number
    name: string
    slug: string
    icon: string | null
    type: string
    sortOrder: number
  }>
}

/**
 * Transform CategoryGroup to UI format (categories already have camelCase-friendly names)
 */
export function transformCategoryGroupsToUI(groups: CategoryGroup[]): UICategoryGroup[] {
  return groups.map((group) => ({
    type: group.type,
    label: group.label,
    categories: group.categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon,
      type: cat.type,
      sortOrder: cat.sort_order,
    })),
  }))
}

/**
 * Transform a RecipeWithDetails to RecipeWithRelations format
 * This is used by recipe detail pages that expect the legacy RecipeWithRelations type
 */
export function transformToRecipeWithRelations(recipe: RecipeWithDetails): RecipeWithRelations {
  // Create author object - service returns partial, we need full User
  const author: User = {
    id: recipe.author?.id || '',
    email: '', // Not available from service, but required by type
    name: recipe.author?.name || 'Unknown',
    username: recipe.author?.username || null,
    avatar: recipe.author?.avatar || null,
    bio: null, // Not available from service
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  // Transform ingredients
  const ingredients: Ingredient[] = recipe.ingredients.map((ing) => ({
    id: ing.id,
    recipeId: ing.recipe_id,
    amount: ing.amount,
    unit: ing.unit,
    item: ing.item,
    notes: ing.notes,
    sortOrder: ing.sort_order,
  }))

  // Transform instructions
  const instructions: Instruction[] = recipe.instructions.map((inst) => ({
    id: inst.id,
    recipeId: inst.recipe_id,
    stepNumber: inst.step_number,
    content: inst.content,
    timerMinutes: inst.timer_minutes,
    photo: inst.photo,
    ingredientIds: inst.ingredient_ids ? JSON.parse(inst.ingredient_ids) : null,
    ingredientLinks: null,
  }))

  // Transform categories
  const categories: RecipeCategory[] = recipe.categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    icon: cat.icon,
    type: cat.type,
  }))

  return {
    id: recipe.id,
    userId: recipe.user_id,
    title: recipe.title,
    slug: recipe.slug,
    description: recipe.description,
    coverPhoto: recipe.cover_photo,
    prepTime: recipe.prep_time,
    cookTime: recipe.cook_time,
    servings: recipe.servings,
    isPublished: recipe.is_published,
    sourceUrl: recipe.source_url,
    sourceAuthor: recipe.source_author,
    sourceSite: recipe.source_site,
    forkedFromId: recipe.forked_from_id,
    avgTasteRating: recipe.avg_taste_rating,
    avgDifficultyRating: recipe.avg_difficulty_rating,
    ratingCount: recipe.rating_count,
    createdAt: new Date(recipe.created_at),
    updatedAt: new Date(recipe.updated_at),
    author,
    ingredients,
    instructions,
    categories,
  }
}
