import { asc } from 'drizzle-orm'
import type { DbCategory } from '~/types/database'
import { categories, db } from '../../db'
import { serializeCategory } from '../../utils/serialize'

export default defineEventHandler(async (): Promise<DbCategory[]> => {
  const categoryRows = await db.query.categories.findMany({
    orderBy: [
      asc(categories.type),
      asc(categories.sortOrder),
      asc(categories.name),
    ],
  })

  return categoryRows.map(serializeCategory)
})
