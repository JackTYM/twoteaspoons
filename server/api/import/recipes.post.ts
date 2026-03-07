import { db, recipes, ingredients, instructions, recipeCategories, categories } from '../../db'
import { requireAuth } from '../../utils/session'
import { getUniqueSlug } from '../../utils/slug'
import type {
  ImportRequest,
  ImportResponse,
  ImportRecipeResult,
  ImportRecipe,
} from '~/types/import'

export default defineEventHandler(async (event): Promise<ImportResponse> => {
  const user = await requireAuth(event)
  const body = await readBody<ImportRequest>(event)

  if (!body.recipes || !Array.isArray(body.recipes)) {
    throw createError({
      statusCode: 400,
      message: 'Request must include a "recipes" array',
    })
  }

  if (body.recipes.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'At least one recipe is required',
    })
  }

  if (body.recipes.length > 100) {
    throw createError({
      statusCode: 400,
      message: 'Maximum 100 recipes per import',
    })
  }

  // Pre-fetch all categories for slug lookup
  const allCategories = await db.select().from(categories)
  const categorySlugToId = new Map(allCategories.map(c => [c.slug, c.id]))

  const results: ImportRecipeResult[] = []
  let successful = 0
  let failed = 0

  for (const recipe of body.recipes) {
    const result = await importRecipe(user.id, recipe, categorySlugToId)
    results.push(result)
    if (result.success) {
      successful++
    } else {
      failed++
    }
  }

  return {
    total: body.recipes.length,
    successful,
    failed,
    results,
  }
})

// Helper to convert empty/invalid values to null for integer fields
function toIntOrNull(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null
  const num = typeof value === 'number' ? value : Number(value)
  return Number.isNaN(num) ? null : num
}

async function importRecipe(
  userId: string,
  recipe: ImportRecipe,
  categorySlugToId: Map<string, number>
): Promise<ImportRecipeResult> {
  try {
    // Validate required fields
    if (!recipe.title || typeof recipe.title !== 'string') {
      return {
        title: recipe.title || '(untitled)',
        success: false,
        error: 'Title is required',
      }
    }

    if (!recipe.ingredients || !Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
      return {
        title: recipe.title,
        success: false,
        error: 'At least one ingredient is required',
      }
    }

    if (!recipe.instructions || !Array.isArray(recipe.instructions) || recipe.instructions.length === 0) {
      return {
        title: recipe.title,
        success: false,
        error: 'At least one instruction is required',
      }
    }

    // Validate ingredients
    for (let i = 0; i < recipe.ingredients.length; i++) {
      const ing = recipe.ingredients[i]
      if (!ing || typeof ing !== 'object') {
        return {
          title: recipe.title,
          success: false,
          error: `Ingredient ${i + 1} is invalid`,
        }
      }
      if (!ing.item || typeof ing.item !== 'string') {
        return {
          title: recipe.title,
          success: false,
          error: `Ingredient ${i + 1} must have an "item" field`,
        }
      }
    }

    // Validate instructions
    for (let i = 0; i < recipe.instructions.length; i++) {
      const inst = recipe.instructions[i]
      if (!inst || typeof inst !== 'object') {
        return {
          title: recipe.title,
          success: false,
          error: `Instruction ${i + 1} is invalid`,
        }
      }
      if (!inst.content || typeof inst.content !== 'string') {
        return {
          title: recipe.title,
          success: false,
          error: `Instruction ${i + 1} must have a "content" field`,
        }
      }
    }

    // Resolve category slugs to IDs
    const categoryIds: number[] = []
    const invalidCategories: string[] = []
    if (recipe.categories && Array.isArray(recipe.categories)) {
      for (const slug of recipe.categories) {
        const id = categorySlugToId.get(slug)
        if (id) {
          categoryIds.push(id)
        } else {
          invalidCategories.push(slug)
        }
      }
    }

    // Warn about invalid categories but continue
    if (invalidCategories.length > 0) {
      console.warn(`Recipe "${recipe.title}" has invalid categories: ${invalidCategories.join(', ')}`)
    }

    // Generate unique slug
    const slug = await getUniqueSlug(userId, recipe.title)

    // Insert recipe
    const [newRecipe] = await db
      .insert(recipes)
      .values({
        userId,
        title: recipe.title,
        slug,
        description: recipe.description || null,
        coverPhoto: recipe.coverPhoto || null,
        prepTime: toIntOrNull(recipe.prepTime),
        cookTime: toIntOrNull(recipe.cookTime),
        servings: toIntOrNull(recipe.servings) || 4,
        isPublished: true, // Imported recipes are published
        sourceUrl: recipe.source?.url || null,
        sourceAuthor: recipe.source?.author || null,
        sourceSite: recipe.source?.site || null,
      })
      .returning()

    if (!newRecipe) {
      return {
        title: recipe.title,
        success: false,
        error: 'Failed to create recipe in database',
      }
    }

    // Insert ingredients
    await db.insert(ingredients).values(
      recipe.ingredients.map((ing, index) => ({
        recipeId: newRecipe.id,
        amount: ing.amount != null ? String(ing.amount) : null,
        unit: ing.unit || null,
        item: ing.item,
        notes: ing.notes || null,
        sortOrder: index,
      }))
    )

    // Insert instructions
    await db.insert(instructions).values(
      recipe.instructions.map((inst, index) => ({
        recipeId: newRecipe.id,
        stepNumber: index + 1,
        content: inst.content,
        timerMinutes: toIntOrNull(inst.timerMinutes),
        ingredientIds: inst.ingredientIndices?.length
          ? JSON.stringify(inst.ingredientIndices)
          : null,
      }))
    )

    // Insert categories
    if (categoryIds.length > 0) {
      await db.insert(recipeCategories).values(
        categoryIds.map(categoryId => ({
          recipeId: newRecipe.id,
          categoryId,
        }))
      )
    }

    return {
      title: recipe.title,
      success: true,
      recipeId: newRecipe.id,
      slug: newRecipe.slug,
    }
  } catch (err) {
    console.error(`Failed to import recipe "${recipe.title}":`, err)
    return {
      title: recipe.title,
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}
