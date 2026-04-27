import type {
  DbRecipe,
  DbIngredient,
  DbInstruction,
  DbUser,
  DbCategory,
  DbRecipeCategory,
  DbFavorite,
} from '~/types/database'

// Types for recipe service
export interface RecipeWithDetails {
  // DbRecipe fields
  id: number
  user_id: string
  title: string
  slug: string
  description: string | null
  cover_photo: string | null
  prep_time: number | null
  cook_time: number | null
  servings: number | null
  is_published: boolean
  source_url: string | null
  source_author: string | null
  source_site: string | null
  forked_from_id: number | null
  avg_taste_rating: string | null
  avg_difficulty_rating: string | null
  rating_count: number | null
  save_count: number | null
  created_at: string
  updated_at: string
  // Relations
  author: Pick<DbUser, 'id' | 'name' | 'username' | 'avatar'> | null
  ingredients: DbIngredient[]
  instructions: DbInstruction[]
  categories: DbCategory[]
  is_saved?: boolean
}

export interface RecipeCreateInput {
  title: string
  slug: string
  description?: string | null
  cover_photo?: string | null
  prep_time?: number | null
  cook_time?: number | null
  servings?: number | null
  is_published?: boolean
  source_url?: string | null
  source_author?: string | null
  source_site?: string | null
  forked_from_id?: number | null
  ingredients: Array<{
    amount?: string | null
    unit?: string | null
    item: string
    notes?: string | null
    sort_order: number
  }>
  instructions: Array<{
    step_number: number
    content: string
    timer_minutes?: number | null
  }>
  category_ids?: number[]
}

interface GetPublicRecipesOptions {
  categorySlugs?: string[]
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useRecipeService() {
  const { from } = useNeonData()
  const { user } = useAuth()

  /**
   * Fetch authors for a list of recipes
   */
  async function fetchAuthors(
    userIds: string[]
  ): Promise<Map<string, Pick<DbUser, 'id' | 'name' | 'username' | 'avatar'>>> {
    if (userIds.length === 0) return new Map()

    const uniqueIds = [...new Set(userIds)]
    const { data: users } = await from('users').select('id, name, username, avatar').in('id', uniqueIds)

    const authorMap = new Map<string, Pick<DbUser, 'id' | 'name' | 'username' | 'avatar'>>()
    if (users) {
      for (const u of users) {
        authorMap.set(u.id, u)
      }
    }
    return authorMap
  }

  /**
   * Fetch ingredients for a list of recipes
   */
  async function fetchIngredients(recipeIds: number[]): Promise<Map<number, DbIngredient[]>> {
    if (recipeIds.length === 0) return new Map()

    const { data: ingredients } = await from('ingredients')
      .select('*')
      .in('recipe_id', recipeIds)
      .order('sort_order', { ascending: true })

    const ingredientMap = new Map<number, DbIngredient[]>()
    if (ingredients) {
      for (const ing of ingredients) {
        const existing = ingredientMap.get(ing.recipe_id) || []
        existing.push(ing)
        ingredientMap.set(ing.recipe_id, existing)
      }
    }
    return ingredientMap
  }

  /**
   * Fetch instructions for a list of recipes
   */
  async function fetchInstructions(recipeIds: number[]): Promise<Map<number, DbInstruction[]>> {
    if (recipeIds.length === 0) return new Map()

    const { data: instructions } = await from('instructions')
      .select('*')
      .in('recipe_id', recipeIds)
      .order('step_number', { ascending: true })

    const instructionMap = new Map<number, DbInstruction[]>()
    if (instructions) {
      for (const inst of instructions) {
        const existing = instructionMap.get(inst.recipe_id) || []
        existing.push(inst)
        instructionMap.set(inst.recipe_id, existing)
      }
    }
    return instructionMap
  }

  /**
   * Fetch categories for a list of recipes
   */
  async function fetchCategories(recipeIds: number[]): Promise<Map<number, DbCategory[]>> {
    if (recipeIds.length === 0) return new Map()

    // First get recipe_categories junction records
    const { data: recipeCategories } = await from('recipe_categories')
      .select('*')
      .in('recipe_id', recipeIds)

    if (!recipeCategories || recipeCategories.length === 0) return new Map()

    const categoryIds = [...new Set(recipeCategories.map((rc: DbRecipeCategory) => rc.category_id))]

    // Then get the actual categories
    const { data: categories } = await from('categories').select('*').in('id', categoryIds)

    const categoryById = new Map<number, DbCategory>()
    if (categories) {
      for (const cat of categories) {
        categoryById.set(cat.id, cat)
      }
    }

    // Build map of recipe_id -> categories
    const categoryMap = new Map<number, DbCategory[]>()
    for (const rc of recipeCategories) {
      const category = categoryById.get(rc.category_id)
      if (category) {
        const existing = categoryMap.get(rc.recipe_id) || []
        existing.push(category)
        categoryMap.set(rc.recipe_id, existing)
      }
    }
    return categoryMap
  }

  /**
   * Fetch saved status for recipes for the current user
   */
  async function fetchSavedStatus(recipeIds: number[]): Promise<Set<number>> {
    if (recipeIds.length === 0 || !user.value) return new Set()

    const { data: favorites } = await from('favorites')
      .select('recipe_id')
      .eq('user_id', user.value.id)
      .in('recipe_id', recipeIds)

    const savedSet = new Set<number>()
    if (favorites) {
      for (const fav of favorites as Array<{ recipe_id: number }>) {
        savedSet.add(fav.recipe_id)
      }
    }
    return savedSet
  }

  /**
   * Combine recipe with all its relations
   */
  function combineRecipeWithDetails(
    recipe: DbRecipe,
    authorMap: Map<string, Pick<DbUser, 'id' | 'name' | 'username' | 'avatar'>>,
    ingredientMap: Map<number, DbIngredient[]>,
    instructionMap: Map<number, DbInstruction[]>,
    categoryMap: Map<number, DbCategory[]>,
    savedSet: Set<number>
  ): RecipeWithDetails {
    return {
      ...recipe,
      author: authorMap.get(recipe.user_id) || null,
      ingredients: ingredientMap.get(recipe.id) || [],
      instructions: instructionMap.get(recipe.id) || [],
      categories: categoryMap.get(recipe.id) || [],
      is_saved: savedSet.has(recipe.id),
    }
  }

  /**
   * Get all published recipes with authors, ingredients, instructions, categories, and isSaved flag
   */
  async function getPublicRecipes(options?: GetPublicRecipesOptions): Promise<RecipeWithDetails[]> {
    // Get base recipes
    let query = from('recipes').select('*').eq('is_published', true)

    // If filtering by categories, we need to get recipe IDs first
    let filteredRecipeIds: number[] | null = null
    if (options?.categorySlugs && options.categorySlugs.length > 0) {
      // Get category IDs for the slugs
      const { data: matchingCategories } = await from('categories')
        .select('id')
        .in('slug', options.categorySlugs)

      if (matchingCategories && matchingCategories.length > 0) {
        const categoryIds = matchingCategories.map((c: { id: number }) => c.id)

        // Get recipe IDs that have these categories
        const { data: recipeCategories } = await from('recipe_categories')
          .select('recipe_id')
          .in('category_id', categoryIds)

        if (recipeCategories) {
          const mappedIds = recipeCategories.map((rc: { recipe_id: number }) => rc.recipe_id)
          filteredRecipeIds = [...new Set<number>(mappedIds)]
        }
      }

      // If no matching recipes, return empty
      if (!filteredRecipeIds || filteredRecipeIds.length === 0) {
        return []
      }

      query = query.in('id', filteredRecipeIds)
    }

    const { data: recipes, error } = await query.order('created_at', { ascending: false })

    if (error || !recipes || recipes.length === 0) {
      return []
    }

    const recipeIds = recipes.map((r: DbRecipe) => r.id)
    const userIds = recipes.map((r: DbRecipe) => r.user_id)

    // Fetch all related data in parallel
    const [authorMap, ingredientMap, instructionMap, categoryMap, savedSet] = await Promise.all([
      fetchAuthors(userIds),
      fetchIngredients(recipeIds),
      fetchInstructions(recipeIds),
      fetchCategories(recipeIds),
      fetchSavedStatus(recipeIds),
    ])

    return recipes.map((recipe: DbRecipe) =>
      combineRecipeWithDetails(recipe, authorMap, ingredientMap, instructionMap, categoryMap, savedSet)
    )
  }

  /**
   * Get a single recipe by username and slug
   */
  async function getRecipeBySlug(username: string, slug: string): Promise<RecipeWithDetails | null> {
    // First find the user by username
    const { data: users } = await from('users').select('id').eq('username', username).limit(1)

    if (!users || users.length === 0) {
      return null
    }

    const userId = users[0].id

    // Get the recipe
    const { data: recipes } = await from('recipes')
      .select('*')
      .eq('user_id', userId)
      .eq('slug', slug)
      .limit(1)

    if (!recipes || recipes.length === 0) {
      return null
    }

    const recipe = recipes[0]
    const recipeIds = [recipe.id]

    // Fetch all related data in parallel
    const [authorMap, ingredientMap, instructionMap, categoryMap, savedSet] = await Promise.all([
      fetchAuthors([recipe.user_id]),
      fetchIngredients(recipeIds),
      fetchInstructions(recipeIds),
      fetchCategories(recipeIds),
      fetchSavedStatus(recipeIds),
    ])

    return combineRecipeWithDetails(recipe, authorMap, ingredientMap, instructionMap, categoryMap, savedSet)
  }

  /**
   * Get a single recipe by ID
   */
  async function getRecipeById(id: number): Promise<RecipeWithDetails | null> {
    const { data: recipes } = await from('recipes').select('*').eq('id', id).limit(1)

    if (!recipes || recipes.length === 0) {
      return null
    }

    const recipe = recipes[0]
    const recipeIds = [recipe.id]

    // Fetch all related data in parallel
    const [authorMap, ingredientMap, instructionMap, categoryMap, savedSet] = await Promise.all([
      fetchAuthors([recipe.user_id]),
      fetchIngredients(recipeIds),
      fetchInstructions(recipeIds),
      fetchCategories(recipeIds),
      fetchSavedStatus(recipeIds),
    ])

    return combineRecipeWithDetails(recipe, authorMap, ingredientMap, instructionMap, categoryMap, savedSet)
  }

  /**
   * Create a new recipe with ingredients, instructions, and categories
   */
  async function createRecipe(input: RecipeCreateInput): Promise<RecipeWithDetails | null> {
    if (!user.value) {
      throw new Error('Must be authenticated to create a recipe')
    }

    // Insert the recipe
    const { data: newRecipes, error: recipeError } = await from('recipes')
      .insert({
        user_id: user.value.id,
        title: input.title,
        slug: input.slug,
        description: input.description ?? null,
        cover_photo: input.cover_photo ?? null,
        prep_time: input.prep_time ?? null,
        cook_time: input.cook_time ?? null,
        servings: input.servings ?? null,
        is_published: input.is_published ?? false,
        source_url: input.source_url ?? null,
        source_author: input.source_author ?? null,
        source_site: input.source_site ?? null,
        forked_from_id: input.forked_from_id ?? null,
        avg_taste_rating: null,
        avg_difficulty_rating: null,
        rating_count: 0,
        save_count: 0,
      })
      .select()

    if (recipeError || !newRecipes || newRecipes.length === 0) {
      throw new Error('Failed to create recipe')
    }

    const newRecipe = newRecipes[0]

    // Insert ingredients
    if (input.ingredients.length > 0) {
      const ingredientInserts = input.ingredients.map((ing) => ({
        recipe_id: newRecipe.id,
        amount: ing.amount ?? null,
        unit: ing.unit ?? null,
        item: ing.item,
        notes: ing.notes ?? null,
        sort_order: ing.sort_order,
      }))

      await from('ingredients').insert(ingredientInserts)
    }

    // Insert instructions
    if (input.instructions.length > 0) {
      const instructionInserts = input.instructions.map((inst) => ({
        recipe_id: newRecipe.id,
        step_number: inst.step_number,
        content: inst.content,
        timer_minutes: inst.timer_minutes ?? null,
        photo: null,
        ingredient_ids: null,
      }))

      await from('instructions').insert(instructionInserts)
    }

    // Insert category associations
    if (input.category_ids && input.category_ids.length > 0) {
      const categoryInserts = input.category_ids.map((categoryId) => ({
        recipe_id: newRecipe.id,
        category_id: categoryId,
      }))

      await from('recipe_categories').insert(categoryInserts)
    }

    // Return the full recipe with details
    return getRecipeById(newRecipe.id)
  }

  /**
   * Update an existing recipe
   */
  async function updateRecipe(recipeId: number, input: Partial<RecipeCreateInput>): Promise<RecipeWithDetails | null> {
    if (!user.value) {
      throw new Error('Must be authenticated to update a recipe')
    }

    // Verify ownership
    const { data: existingRecipes } = await from('recipes').select('user_id').eq('id', recipeId).limit(1)

    if (!existingRecipes || existingRecipes.length === 0) {
      throw new Error('Recipe not found')
    }

    if (existingRecipes[0].user_id !== user.value.id) {
      throw new Error('Not authorized to update this recipe')
    }

    // Build update object for recipe fields
    const recipeUpdate: Record<string, unknown> = {}
    if (input.title !== undefined) recipeUpdate.title = input.title
    if (input.slug !== undefined) recipeUpdate.slug = input.slug
    if (input.description !== undefined) recipeUpdate.description = input.description
    if (input.cover_photo !== undefined) recipeUpdate.cover_photo = input.cover_photo
    if (input.prep_time !== undefined) recipeUpdate.prep_time = input.prep_time
    if (input.cook_time !== undefined) recipeUpdate.cook_time = input.cook_time
    if (input.servings !== undefined) recipeUpdate.servings = input.servings
    if (input.is_published !== undefined) recipeUpdate.is_published = input.is_published
    if (input.source_url !== undefined) recipeUpdate.source_url = input.source_url
    if (input.source_author !== undefined) recipeUpdate.source_author = input.source_author
    if (input.source_site !== undefined) recipeUpdate.source_site = input.source_site
    if (input.forked_from_id !== undefined) recipeUpdate.forked_from_id = input.forked_from_id

    // Update recipe if there are fields to update
    if (Object.keys(recipeUpdate).length > 0) {
      await from('recipes').update(recipeUpdate).eq('id', recipeId)
    }

    // Update ingredients if provided
    if (input.ingredients !== undefined) {
      // Delete existing ingredients
      await from('ingredients').delete().eq('recipe_id', recipeId)

      // Insert new ingredients
      if (input.ingredients.length > 0) {
        const ingredientInserts = input.ingredients.map((ing) => ({
          recipe_id: recipeId,
          amount: ing.amount ?? null,
          unit: ing.unit ?? null,
          item: ing.item,
          notes: ing.notes ?? null,
          sort_order: ing.sort_order,
        }))

        await from('ingredients').insert(ingredientInserts)
      }
    }

    // Update instructions if provided
    if (input.instructions !== undefined) {
      // Delete existing instructions
      await from('instructions').delete().eq('recipe_id', recipeId)

      // Insert new instructions
      if (input.instructions.length > 0) {
        const instructionInserts = input.instructions.map((inst) => ({
          recipe_id: recipeId,
          step_number: inst.step_number,
          content: inst.content,
          timer_minutes: inst.timer_minutes ?? null,
          photo: null,
          ingredient_ids: null,
        }))

        await from('instructions').insert(instructionInserts)
      }
    }

    // Update categories if provided
    if (input.category_ids !== undefined) {
      // Delete existing category associations
      await from('recipe_categories').delete().eq('recipe_id', recipeId)

      // Insert new category associations
      if (input.category_ids.length > 0) {
        const categoryInserts = input.category_ids.map((categoryId) => ({
          recipe_id: recipeId,
          category_id: categoryId,
        }))

        await from('recipe_categories').insert(categoryInserts)
      }
    }

    // Return the updated recipe with details
    return getRecipeById(recipeId)
  }

  /**
   * Delete a recipe
   */
  async function deleteRecipe(recipeId: number): Promise<void> {
    if (!user.value) {
      throw new Error('Must be authenticated to delete a recipe')
    }

    // Verify ownership
    const { data: existingRecipes } = await from('recipes').select('user_id').eq('id', recipeId).limit(1)

    if (!existingRecipes || existingRecipes.length === 0) {
      throw new Error('Recipe not found')
    }

    if (existingRecipes[0].user_id !== user.value.id) {
      throw new Error('Not authorized to delete this recipe')
    }

    // Delete related records first (ingredients, instructions, categories, favorites, etc.)
    await Promise.all([
      from('ingredients').delete().eq('recipe_id', recipeId),
      from('instructions').delete().eq('recipe_id', recipeId),
      from('recipe_categories').delete().eq('recipe_id', recipeId),
      from('favorites').delete().eq('recipe_id', recipeId),
      from('recipe_tags').delete().eq('recipe_id', recipeId),
      from('collection_recipes').delete().eq('recipe_id', recipeId),
      from('comments').delete().eq('recipe_id', recipeId),
      from('recipe_slug_history').delete().eq('recipe_id', recipeId),
    ])

    // Delete the recipe itself
    await from('recipes').delete().eq('id', recipeId)
  }

  /**
   * Save a recipe to favorites
   */
  async function saveRecipe(recipeId: number): Promise<void> {
    if (!user.value) {
      throw new Error('Must be authenticated to save a recipe')
    }

    // Check if already saved
    const { data: existing } = await from('favorites')
      .select('recipe_id')
      .eq('user_id', user.value.id)
      .eq('recipe_id', recipeId)
      .limit(1)

    if (existing && existing.length > 0) {
      // Already saved
      return
    }

    // Add to favorites
    await from('favorites').insert({
      user_id: user.value.id,
      recipe_id: recipeId,
      created_at: new Date().toISOString(),
    })

    // Increment save_count on the recipe
    const { data: recipes } = await from('recipes').select('save_count').eq('id', recipeId).limit(1)

    if (recipes && recipes.length > 0) {
      const currentCount = recipes[0].save_count || 0
      await from('recipes')
        .update({ save_count: currentCount + 1 })
        .eq('id', recipeId)
    }
  }

  /**
   * Remove a recipe from favorites
   */
  async function unsaveRecipe(recipeId: number): Promise<void> {
    if (!user.value) {
      throw new Error('Must be authenticated to unsave a recipe')
    }

    // Check if saved
    const { data: existing } = await from('favorites')
      .select('recipe_id')
      .eq('user_id', user.value.id)
      .eq('recipe_id', recipeId)
      .limit(1)

    if (!existing || existing.length === 0) {
      // Not saved
      return
    }

    // Remove from favorites
    await from('favorites').delete().eq('user_id', user.value.id).eq('recipe_id', recipeId)

    // Decrement save_count on the recipe
    const { data: recipes } = await from('recipes').select('save_count').eq('id', recipeId).limit(1)

    if (recipes && recipes.length > 0) {
      const currentCount = recipes[0].save_count || 0
      await from('recipes')
        .update({ save_count: Math.max(0, currentCount - 1) })
        .eq('id', recipeId)
    }
  }

  /**
   * Get all recipes owned by the current user
   */
  async function getMyRecipes(): Promise<RecipeWithDetails[]> {
    if (!user.value) {
      return []
    }

    const { data: recipes } = await from('recipes')
      .select('*')
      .eq('user_id', user.value.id)
      .order('updated_at', { ascending: false })

    if (!recipes || recipes.length === 0) {
      return []
    }

    const recipeIds = recipes.map((r: DbRecipe) => r.id)

    // Fetch all related data in parallel
    const [authorMap, ingredientMap, instructionMap, categoryMap, savedSet] = await Promise.all([
      fetchAuthors([user.value.id]),
      fetchIngredients(recipeIds),
      fetchInstructions(recipeIds),
      fetchCategories(recipeIds),
      fetchSavedStatus(recipeIds),
    ])

    return recipes.map((recipe: DbRecipe) =>
      combineRecipeWithDetails(recipe, authorMap, ingredientMap, instructionMap, categoryMap, savedSet)
    )
  }

  /**
   * Get all recipes saved/favorited by the current user
   */
  async function getSavedRecipes(): Promise<RecipeWithDetails[]> {
    if (!user.value) {
      return []
    }

    // Get favorite recipe IDs
    const { data: favorites } = await from('favorites')
      .select('recipe_id')
      .eq('user_id', user.value.id)
      .order('created_at', { ascending: false })

    if (!favorites || favorites.length === 0) {
      return []
    }

    const recipeIds: number[] = favorites.map((f: DbFavorite) => f.recipe_id)

    // Get the actual recipes
    const { data: recipesData } = await from('recipes').select('*').in('id', recipeIds)

    if (!recipesData || recipesData.length === 0) {
      return []
    }

    const recipes = recipesData as DbRecipe[]
    const userIds = recipes.map((r) => r.user_id)

    // Fetch all related data in parallel
    const [authorMap, ingredientMap, instructionMap, categoryMap] = await Promise.all([
      fetchAuthors(userIds),
      fetchIngredients(recipeIds),
      fetchInstructions(recipeIds),
      fetchCategories(recipeIds),
    ])

    // All these are saved by definition
    const savedSet = new Set<number>(recipeIds)

    // Sort recipes to match the order from favorites
    const recipeById = new Map<number, DbRecipe>()
    for (const recipe of recipes) {
      recipeById.set(recipe.id, recipe)
    }

    return recipeIds
      .map((id) => recipeById.get(id))
      .filter((recipe): recipe is DbRecipe => recipe !== undefined)
      .map((recipe) =>
        combineRecipeWithDetails(recipe, authorMap, ingredientMap, instructionMap, categoryMap, savedSet)
      )
  }

  return {
    getPublicRecipes,
    getRecipeBySlug,
    getRecipeById,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    saveRecipe,
    unsaveRecipe,
    getMyRecipes,
    getSavedRecipes,
  }
}
