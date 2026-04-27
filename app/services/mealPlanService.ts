import type { DbMealPlan, DbRecipe, DbUser } from '~/types/database'

export interface MealPlanWithRecipe extends DbMealPlan {
  recipe: Pick<DbRecipe, 'id' | 'title' | 'slug' | 'cover_photo' | 'prep_time' | 'cook_time' | 'servings' | 'user_id'> & {
    author?: { username: string | null }
  } | null
}

export interface MealPlanCreateInput {
  recipe_id: number
  date: string // ISO date string
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  servings?: number
}

/**
 * Service for managing meal plans
 *
 * Provides CRUD operations for meal plans with recipe details.
 * All operations require authentication.
 *
 * @example
 * ```typescript
 * const mealPlanService = useMealPlanService()
 *
 * // Get meal plans for a week
 * const { data, error } = await mealPlanService.getMealPlans('2026-04-20', '2026-04-26')
 *
 * // Create a new meal plan
 * const { data: newPlan, error } = await mealPlanService.createMealPlan({
 *   recipe_id: 123,
 *   date: '2026-04-26',
 *   meal_type: 'dinner',
 *   servings: 4
 * })
 * ```
 */
export function useMealPlanService() {
  const { from } = useNeonData()
  const { user, isAuthenticated } = useAuth()

  /**
   * Ensure user is authenticated before performing operations
   */
  function requireAuth(): string {
    if (!isAuthenticated.value || !user.value?.id) {
      throw new Error('Authentication required')
    }
    return user.value.id
  }

  /**
   * Get meal plans within a date range with recipe details
   *
   * @param startDate - Start date (ISO format: YYYY-MM-DD)
   * @param endDate - End date (ISO format: YYYY-MM-DD)
   * @returns Meal plans with associated recipe data
   */
  async function getMealPlans(
    startDate: string,
    endDate: string
  ): Promise<{ data: MealPlanWithRecipe[] | null; error: Error | null }> {
    const userId = requireAuth()

    try {
      // Fetch meal plans for the date range
      const { data: mealPlans, error: mealPlansError } = await from('meal_plans')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })

      if (mealPlansError) {
        return { data: null, error: mealPlansError }
      }

      if (!mealPlans || mealPlans.length === 0) {
        return { data: [], error: null }
      }

      // Get unique recipe IDs
      const recipeIds = [...new Set(mealPlans.map((mp: DbMealPlan) => mp.recipe_id))]

      // Fetch recipes for the meal plans
      const { data: recipes, error: recipesError } = await from('recipes')
        .select('id, title, slug, cover_photo, prep_time, cook_time, servings, user_id')
        .in('id', recipeIds)

      if (recipesError) {
        return { data: null, error: recipesError }
      }

      // Type for recipe select result
      type RecipeSelectResult = Pick<DbRecipe, 'id' | 'title' | 'slug' | 'cover_photo' | 'prep_time' | 'cook_time' | 'servings' | 'user_id'>

      // Fetch authors for recipes
      const authorIds = [...new Set((recipes || []).map((r: RecipeSelectResult) => r.user_id))]
      const { data: authors } = await from('users')
        .select('id, username')
        .in('id', authorIds)

      // Type for author select result
      type AuthorSelectResult = Pick<DbUser, 'id' | 'username'>

      // Create lookup maps
      const recipeMap = new Map<number, RecipeSelectResult>(
        (recipes || []).map((r: RecipeSelectResult) => [r.id, r])
      )
      const authorMap = new Map<string, AuthorSelectResult>(
        (authors || []).map((a: AuthorSelectResult) => [a.id, a])
      )

      // Combine meal plans with recipe details
      const mealPlansWithRecipes: MealPlanWithRecipe[] = mealPlans.map((mp: DbMealPlan) => {
        const recipe = recipeMap.get(mp.recipe_id)
        const author = recipe ? authorMap.get(recipe.user_id) : null

        return {
          ...mp,
          recipe: recipe
            ? {
                ...recipe,
                author: author ? { username: author.username } : undefined,
              }
            : null,
        }
      })

      return { data: mealPlansWithRecipes, error: null }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to fetch meal plans'),
      }
    }
  }

  /**
   * Create a new meal plan entry
   *
   * @param input - Meal plan creation data
   * @returns The created meal plan
   */
  async function createMealPlan(
    input: MealPlanCreateInput
  ): Promise<{ data: DbMealPlan | null; error: Error | null }> {
    const userId = requireAuth()

    try {
      const { data, error } = await from('meal_plans')
        .insert({
          user_id: userId,
          recipe_id: input.recipe_id,
          date: input.date,
          meal_type: input.meal_type,
          servings: input.servings ?? 1,
        })
        .select()
        .single()

      if (error) {
        return { data: null, error }
      }

      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to create meal plan'),
      }
    }
  }

  /**
   * Update an existing meal plan
   *
   * @param planId - ID of the meal plan to update
   * @param input - Partial meal plan data to update
   * @returns The updated meal plan
   */
  async function updateMealPlan(
    planId: number,
    input: Partial<MealPlanCreateInput>
  ): Promise<{ data: DbMealPlan | null; error: Error | null }> {
    const userId = requireAuth()

    try {
      // Build update object, only including defined fields
      const updateData: Record<string, unknown> = {}
      if (input.recipe_id !== undefined) updateData.recipe_id = input.recipe_id
      if (input.date !== undefined) updateData.date = input.date
      if (input.meal_type !== undefined) updateData.meal_type = input.meal_type
      if (input.servings !== undefined) updateData.servings = input.servings

      const { data, error } = await from('meal_plans')
        .update(updateData)
        .eq('id', planId)
        .eq('user_id', userId) // Ensure user owns this meal plan
        .select()
        .single()

      if (error) {
        return { data: null, error }
      }

      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to update meal plan'),
      }
    }
  }

  /**
   * Delete a meal plan
   *
   * @param planId - ID of the meal plan to delete
   * @returns Success status
   */
  async function deleteMealPlan(
    planId: number
  ): Promise<{ error: Error | null }> {
    const userId = requireAuth()

    try {
      const { error } = await from('meal_plans')
        .delete()
        .eq('id', planId)
        .eq('user_id', userId) // Ensure user owns this meal plan

      if (error) {
        return { error }
      }

      return { error: null }
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error('Failed to delete meal plan'),
      }
    }
  }

  return {
    getMealPlans,
    createMealPlan,
    updateMealPlan,
    deleteMealPlan,
  }
}
