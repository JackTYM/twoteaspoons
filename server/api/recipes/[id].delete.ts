import { eq } from 'drizzle-orm'
import { db, recipes } from '../../db'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))

  if (isNaN(id)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid recipe ID',
    })
  }

  // Check recipe exists
  const existing = await db.query.recipes.findFirst({
    where: eq(recipes.id, id),
  })

  if (!existing) {
    throw createError({
      statusCode: 404,
      message: 'Recipe not found',
    })
  }

  // TODO: Check ownership once auth is integrated

  await db.delete(recipes).where(eq(recipes.id, id))

  return { success: true }
})
