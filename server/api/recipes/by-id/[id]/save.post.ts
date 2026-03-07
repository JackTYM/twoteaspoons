import { eq, sql, and } from 'drizzle-orm'
import { db, favorites, recipes } from '../../../../db'
import { requireAuth } from '../../../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const recipeId = parseInt(getRouterParam(event, 'id') || '', 10)
  if (isNaN(recipeId)) {
    throw createError({ statusCode: 400, message: 'Invalid recipe ID' })
  }

  // Check if recipe exists
  const [recipe] = await db
    .select({ id: recipes.id })
    .from(recipes)
    .where(eq(recipes.id, recipeId))
    .limit(1)

  if (!recipe) {
    throw createError({ statusCode: 404, message: 'Recipe not found' })
  }

  // Check if already saved
  const [existing] = await db
    .select({ recipeId: favorites.recipeId })
    .from(favorites)
    .where(
      and(
        eq(favorites.userId, user.id),
        eq(favorites.recipeId, recipeId)
      )
    )
    .limit(1)

  if (existing) {
    // Already saved, return success
    return { saved: true, message: 'Recipe already saved' }
  }

  // Save the recipe
  await db.insert(favorites).values({
    userId: user.id,
    recipeId,
  })

  // Increment save count on recipe
  await db
    .update(recipes)
    .set({
      saveCount: sql`COALESCE(${recipes.saveCount}, 0) + 1`,
    })
    .where(eq(recipes.id, recipeId))

  return { saved: true, message: 'Recipe saved' }
})
