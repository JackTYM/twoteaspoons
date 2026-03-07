import { eq } from 'drizzle-orm'
import { db, recipes, ingredients, instructions, users } from '../../../../db'
import { requireAuth } from '../../../../utils/session'
import { resolveRecipeBySlug } from '../../../../utils/recipeResolver'
import { getUniqueSlug, getUniqueUsername } from '../../../../utils/slug'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const username = getRouterParam(event, 'username')
  const slug = getRouterParam(event, 'slug')

  if (!username || !slug) {
    throw createError({
      statusCode: 400,
      message: 'Username and slug are required',
    })
  }

  // Get the original recipe with all details
  const result = await resolveRecipeBySlug(username, slug)

  if (!result) {
    throw createError({
      statusCode: 404,
      message: 'Recipe not found',
    })
  }

  const original = result.recipe

  // Check access: must be published OR owned by current user
  if (!original.isPublished && original.userId !== user.id) {
    throw createError({
      statusCode: 404,
      message: 'Recipe not found',
    })
  }

  // Generate slug for the forked recipe
  const forkedTitle = `${original.title} (My Version)`
  const forkedSlug = await getUniqueSlug(user.id, forkedTitle)

  // Create the forked recipe
  const [forkedRecipe] = await db
    .insert(recipes)
    .values({
      userId: user.id,
      title: forkedTitle,
      slug: forkedSlug,
      description: original.description,
      coverPhoto: original.coverPhoto,
      prepTime: original.prepTime,
      cookTime: original.cookTime,
      servings: original.servings,
      isPublished: true, // Default to public
      forkedFromId: original.id,
      // Keep source attribution from original if it was imported
      sourceUrl: original.sourceUrl,
      sourceAuthor: original.sourceAuthor,
      sourceSite: original.sourceSite,
    })
    .returning()

  if (!forkedRecipe) {
    throw createError({
      statusCode: 500,
      message: 'Failed to fork recipe',
    })
  }

  // Copy ingredients
  if (original.ingredients.length > 0) {
    await db.insert(ingredients).values(
      original.ingredients.map((ing, index) => ({
        recipeId: forkedRecipe.id,
        amount: ing.amount,
        unit: ing.unit,
        item: ing.item,
        notes: ing.notes,
        sortOrder: index,
      }))
    )
  }

  // Copy instructions
  if (original.instructions.length > 0) {
    await db.insert(instructions).values(
      original.instructions.map((inst) => ({
        recipeId: forkedRecipe.id,
        stepNumber: inst.stepNumber,
        content: inst.content,
        timerMinutes: inst.timerMinutes,
        photo: inst.photo,
      }))
    )
  }

  // Ensure the current user exists in local users table for author relation
  const existingUser = await db.query.users.findFirst({
    where: eq(users.id, user.id),
  })

  if (!existingUser) {
    const emailPrefix = user.email.split('@')[0]
    const displayName = user.name || emailPrefix || 'User'
    const newUsername = await getUniqueUsername(displayName)

    await db
      .insert(users)
      .values({
        id: user.id,
        email: user.email,
        name: displayName,
        username: newUsername,
      })
      .onConflictDoNothing()
  }

  // Fetch full recipe with relations for proper URL generation
  const fullRecipe = await db.query.recipes.findFirst({
    where: eq(recipes.id, forkedRecipe.id),
    with: {
      author: true,
      ingredients: true,
      instructions: true,
    },
  })

  return { recipe: fullRecipe }
})
