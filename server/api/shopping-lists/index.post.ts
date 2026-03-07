import { inArray } from 'drizzle-orm'
import { db, shoppingLists, shoppingItems, recipes } from '../../db'
import { consolidateIngredients } from '../../utils/ingredientConsolidator'
import { requireAuth } from '../../utils/session'
import { getUniqueShoppingListSlug } from '../../utils/slug'

interface CreateListBody {
  name: string
  recipeIds: number[]
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody<CreateListBody>(event)

  if (!body.name) {
    throw createError({
      statusCode: 400,
      message: 'Name is required',
    })
  }

  if (!body.recipeIds || body.recipeIds.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'At least one recipe is required',
    })
  }

  // Fetch recipes and their ingredients
  const recipeList = await db.query.recipes.findMany({
    where: inArray(recipes.id, body.recipeIds),
    with: {
      ingredients: true,
    },
  })

  if (recipeList.length === 0) {
    throw createError({
      statusCode: 404,
      message: 'No recipes found',
    })
  }

  // Gather all ingredients with recipe names
  const allIngredients = recipeList.flatMap(recipe =>
    recipe.ingredients.map(ing => ({
      amount: ing.amount,
      unit: ing.unit,
      item: ing.item,
      recipeId: recipe.id,
      recipeName: recipe.title,
    }))
  )

  // Consolidate ingredients
  const consolidated = consolidateIngredients(allIngredients)

  // Create shopping list with slug
  const slug = await getUniqueShoppingListSlug(user.id, body.name)

  const [newList] = await db.insert(shoppingLists).values({
    userId: user.id,
    name: body.name,
    slug,
  }).returning()

  if (!newList) {
    throw createError({
      statusCode: 500,
      message: 'Failed to create shopping list',
    })
  }

  // Add items to list
  if (consolidated.length > 0) {
    await db.insert(shoppingItems).values(
      consolidated.map(item => ({
        listId: newList.id,
        item: item.item,
        amount: item.totalAmount || null,
        unit: item.unit,
        section: item.section,
        checked: false,
      }))
    )
  }

  return { list: newList, itemCount: consolidated.length }
})
