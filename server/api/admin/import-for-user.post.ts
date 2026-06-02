import { eq } from 'drizzle-orm'
import { db, recipes, ingredients, instructions, recipeCategories, categories, users } from '../../db'
import { requireAuth } from '../../utils/session'
import { getUniqueSlug } from '../../utils/slug'
import type { ImportRecipe, ImportRecipeResult, ImportResponse } from '~/types/import'

const ADMIN_EMAIL = 'jacksonkyarger@gmail.com'

function toIntOrNull(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null
  const num = typeof value === 'number' ? value : Number(value)
  return Number.isNaN(num) ? null : num
}

async function importRecipeForUser(
  userId: string,
  recipe: ImportRecipe,
  categorySlugToId: Map<string, number>
): Promise<ImportRecipeResult> {
  try {
    if (!recipe.title || typeof recipe.title !== 'string') {
      return { title: recipe.title || '(untitled)', success: false, error: 'Title is required' }
    }
    if (!recipe.ingredients || !Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
      return { title: recipe.title, success: false, error: 'At least one ingredient is required' }
    }
    if (!recipe.instructions || !Array.isArray(recipe.instructions) || recipe.instructions.length === 0) {
      return { title: recipe.title, success: false, error: 'At least one instruction is required' }
    }
    for (let i = 0; i < recipe.ingredients.length; i++) {
      const ing = recipe.ingredients[i]
      if (!ing || typeof ing !== 'object' || !ing.item || typeof ing.item !== 'string') {
        return { title: recipe.title, success: false, error: `Ingredient ${i + 1} must have an "item" field` }
      }
    }
    for (let i = 0; i < recipe.instructions.length; i++) {
      const inst = recipe.instructions[i]
      if (!inst || typeof inst !== 'object' || !inst.content || typeof inst.content !== 'string') {
        return { title: recipe.title, success: false, error: `Instruction ${i + 1} must have a "content" field` }
      }
    }

    const categoryIds: number[] = []
    if (recipe.categories && Array.isArray(recipe.categories)) {
      for (const slug of recipe.categories) {
        const id = categorySlugToId.get(slug)
        if (id) categoryIds.push(id)
      }
    }

    const slug = await getUniqueSlug(userId, recipe.title)

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
        isPublished: true,
        sourceUrl: recipe.source?.url || null,
        sourceAuthor: recipe.source?.author || null,
        sourceSite: recipe.source?.site || null,
      })
      .returning()

    if (!newRecipe) {
      return { title: recipe.title, success: false, error: 'Failed to create recipe in database' }
    }

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

    await db.insert(instructions).values(
      recipe.instructions.map((inst, index) => ({
        recipeId: newRecipe.id,
        stepNumber: index + 1,
        content: inst.content,
        timerMinutes: toIntOrNull(inst.timerMinutes),
        ingredientIds: inst.ingredientIndices?.length ? JSON.stringify(inst.ingredientIndices) : null,
      }))
    )

    if (categoryIds.length > 0) {
      await db.insert(recipeCategories).values(categoryIds.map(categoryId => ({ recipeId: newRecipe.id, categoryId })))
    }

    return { title: recipe.title, success: true, recipeId: newRecipe.id, slug: newRecipe.slug }
  } catch (err) {
    console.error(`Failed to import recipe "${recipe.title}":`, err)
    return { title: recipe.title, success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export default defineEventHandler(async (event): Promise<ImportResponse> => {
  const admin = await requireAuth(event)

  if (admin.email !== ADMIN_EMAIL) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const body = await readBody<{ targetUsername: string; recipes: ImportRecipe[] }>(event)

  if (!body.targetUsername || typeof body.targetUsername !== 'string') {
    throw createError({ statusCode: 400, message: 'targetUsername is required' })
  }
  if (!body.recipes || !Array.isArray(body.recipes) || body.recipes.length === 0) {
    throw createError({ statusCode: 400, message: 'At least one recipe is required' })
  }
  if (body.recipes.length > 100) {
    throw createError({ statusCode: 400, message: 'Maximum 100 recipes per import' })
  }

  const targetUser = await db.query.users.findFirst({
    where: eq(users.username, body.targetUsername),
    columns: { id: true, username: true },
  })

  if (!targetUser) {
    throw createError({ statusCode: 404, message: `User "${body.targetUsername}" not found` })
  }

  const allCategories = await db.select().from(categories)
  const categorySlugToId = new Map(allCategories.map(c => [c.slug, c.id]))

  const results: ImportRecipeResult[] = []
  let successful = 0
  let failed = 0

  for (const recipe of body.recipes) {
    const result = await importRecipeForUser(targetUser.id, recipe, categorySlugToId)
    results.push(result)
    if (result.success) { successful++ } else { failed++ }
  }

  return { total: body.recipes.length, successful, failed, results }
})
