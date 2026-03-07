import { eq, inArray } from 'drizzle-orm'
import { db, recipes, recipeCategories, categories } from '../../../../db'
import { requireAuth } from '../../../../utils/session'

interface SetCategoriesBody {
  categoryIds: number[]
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const recipeId = Number(getRouterParam(event, 'id'))
  const body = await readBody<SetCategoriesBody>(event)

  if (!recipeId || isNaN(recipeId)) {
    throw createError({
      statusCode: 400,
      message: 'Valid recipe ID is required',
    })
  }

  // Check recipe exists and user owns it
  const recipe = await db.query.recipes.findFirst({
    where: eq(recipes.id, recipeId),
  })

  if (!recipe) {
    throw createError({
      statusCode: 404,
      message: 'Recipe not found',
    })
  }

  if (recipe.userId !== user.id) {
    throw createError({
      statusCode: 403,
      message: 'You can only update your own recipes',
    })
  }

  const categoryIds = body.categoryIds || []

  // Validate that all category IDs exist
  if (categoryIds.length > 0) {
    const validCategories = await db
      .select({ id: categories.id })
      .from(categories)
      .where(inArray(categories.id, categoryIds))

    if (validCategories.length !== categoryIds.length) {
      throw createError({
        statusCode: 400,
        message: 'One or more invalid category IDs',
      })
    }
  }

  // Delete existing categories for this recipe
  await db
    .delete(recipeCategories)
    .where(eq(recipeCategories.recipeId, recipeId))

  // Insert new categories
  if (categoryIds.length > 0) {
    await db.insert(recipeCategories).values(
      categoryIds.map(categoryId => ({
        recipeId,
        categoryId,
      }))
    )
  }

  // Return updated categories
  const updatedCategories = categoryIds.length > 0
    ? await db
        .select({
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          icon: categories.icon,
          type: categories.type,
        })
        .from(categories)
        .where(inArray(categories.id, categoryIds))
    : []

  return { categories: updatedCategories }
})
