import type { DbCollection, DbRecipe, DbCollectionRecipe, DbUser } from '~/types/database'

// Recipe with author info for URL generation
export interface RecipeWithAuthor extends DbRecipe {
  author: { username: string | null } | null
}

export interface CollectionWithRecipes extends DbCollection {
  recipes: RecipeWithAuthor[]
  recipe_count: number
}

export interface CollectionCreateInput {
  name: string
  slug: string
  description?: string | null
  is_public?: boolean
  cover_photo?: string | null
}

/**
 * Service for managing collections (cookbooks)
 *
 * Provides CRUD operations for collections and collection-recipe associations.
 * Collections can be public (visible to all) or private (owner only).
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useCollectionService() {
  const { from } = useNeonData()
  const { user } = useAuth()

  /**
   * Get all collections for the current user with recipe counts
   */
  async function getMyCollections(): Promise<{
    data: (DbCollection & { recipe_count: number })[] | null
    error: Error | null
  }> {
    if (!user.value?.id) {
      return { data: null, error: new Error('Not authenticated') }
    }

    try {
      // Get user's collections
      const { data: collections, error: collectionError } = await from('collections')
        .select('*')
        .eq('user_id', user.value.id)
        .order('created_at', { ascending: false })

      if (collectionError) {
        return { data: null, error: collectionError }
      }

      if (!collections || collections.length === 0) {
        return { data: [], error: null }
      }

      // Get recipe counts for each collection
      const { data: collectionRecipes, error: crError } = await from('collection_recipes')
        .select('collection_id')

      if (crError) {
        return { data: null, error: crError }
      }

      // Count recipes per collection
      const countMap = new Map<number, number>()
      if (collectionRecipes) {
        for (const cr of collectionRecipes) {
          const collectionId = cr.collection_id
          // Only count if collection belongs to user
          if (collections.some((c: DbCollection) => c.id === collectionId)) {
            countMap.set(collectionId, (countMap.get(collectionId) || 0) + 1)
          }
        }
      }

      // Merge counts into collections
      const collectionsWithCounts = collections.map((collection: DbCollection) => ({
        ...collection,
        recipe_count: countMap.get(collection.id) || 0,
      }))

      return { data: collectionsWithCounts, error: null }
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error('Failed to fetch collections') }
    }
  }

  /**
   * Get a collection by username and slug with all its recipes
   * Public collections are visible to everyone, private only to owner
   */
  async function getCollectionBySlug(
    username: string,
    slug: string
  ): Promise<{ data: CollectionWithRecipes | null; error: Error | null }> {
    try {
      // First get the user by username
      const { data: users, error: userError } = await from('users')
        .select('id')
        .eq('username', username)
        .limit(1)

      if (userError) {
        return { data: null, error: userError }
      }

      if (!users || users.length === 0) {
        return { data: null, error: new Error('User not found') }
      }

      const ownerId = users[0].id
      const isOwner = user.value?.id === ownerId

      // Get the collection
      const { data: collections, error: collectionError } = await from('collections')
        .select('*')
        .eq('user_id', ownerId)
        .eq('slug', slug)
        .limit(1)

      if (collectionError) {
        return { data: null, error: collectionError }
      }

      if (!collections || collections.length === 0) {
        return { data: null, error: new Error('Collection not found') }
      }

      const collection = collections[0]

      // Check visibility - private collections only visible to owner
      if (!collection.is_public && !isOwner) {
        return { data: null, error: new Error('Collection not found') }
      }

      // Get collection recipes junction table entries
      const { data: crData, error: crError } = await from('collection_recipes')
        .select('*')
        .eq('collection_id', collection.id)
        .order('sort_order', { ascending: true })

      if (crError) {
        return { data: null, error: crError }
      }

      const collectionRecipes = (crData || []) as DbCollectionRecipe[]
      let recipes: RecipeWithAuthor[] = []

      if (collectionRecipes.length > 0) {
        const recipeIds = collectionRecipes.map(cr => cr.recipe_id)

        // Get the actual recipes
        const { data: recipeData, error: recipeError } = await from('recipes')
          .select('*')
          .in('id', recipeIds)

        if (recipeError) {
          return { data: null, error: recipeError }
        }

        if (recipeData) {
          // Get unique user IDs from recipes
          const userIds = [...new Set((recipeData as DbRecipe[]).map(r => r.user_id))]

          // Fetch authors
          const authorMap = new Map<string, { username: string | null }>()
          if (userIds.length > 0) {
            const { data: users } = await from('users')
              .select('id, username')
              .in('id', userIds)

            if (users) {
              for (const u of users as Pick<DbUser, 'id' | 'username'>[]) {
                authorMap.set(u.id, { username: u.username })
              }
            }
          }

          // Sort recipes by their order in collection_recipes and add author info
          const orderMap = new Map<number, number>(
            collectionRecipes.map(cr => [cr.recipe_id, cr.sort_order])
          )
          recipes = (recipeData as DbRecipe[])
            .map(r => ({
              ...r,
              author: authorMap.get(r.user_id) || null,
            }))
            .sort((a, b) => {
              const orderA = orderMap.get(a.id) ?? 0
              const orderB = orderMap.get(b.id) ?? 0
              return orderA - orderB
            })
        }
      }

      return {
        data: {
          ...collection,
          recipes,
          recipe_count: recipes.length,
        },
        error: null,
      }
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error('Failed to fetch collection') }
    }
  }

  /**
   * Get a collection by ID
   * Public collections are visible to everyone, private only to owner
   */
  async function getCollectionById(
    id: number
  ): Promise<{ data: CollectionWithRecipes | null; error: Error | null }> {
    try {
      // Get the collection
      const { data: collections, error: collectionError } = await from('collections')
        .select('*')
        .eq('id', id)
        .limit(1)

      if (collectionError) {
        return { data: null, error: collectionError }
      }

      if (!collections || collections.length === 0) {
        return { data: null, error: new Error('Collection not found') }
      }

      const collection = collections[0]
      const isOwner = user.value?.id === collection.user_id

      // Check visibility - private collections only visible to owner
      if (!collection.is_public && !isOwner) {
        return { data: null, error: new Error('Collection not found') }
      }

      // Get collection recipes junction table entries
      const { data: crData, error: crError } = await from('collection_recipes')
        .select('*')
        .eq('collection_id', collection.id)
        .order('sort_order', { ascending: true })

      if (crError) {
        return { data: null, error: crError }
      }

      const collectionRecipes = (crData || []) as DbCollectionRecipe[]
      let recipes: RecipeWithAuthor[] = []

      if (collectionRecipes.length > 0) {
        const recipeIds = collectionRecipes.map(cr => cr.recipe_id)

        // Get the actual recipes
        const { data: recipeData, error: recipeError } = await from('recipes')
          .select('*')
          .in('id', recipeIds)

        if (recipeError) {
          return { data: null, error: recipeError }
        }

        if (recipeData) {
          // Get unique user IDs from recipes
          const userIds = [...new Set((recipeData as DbRecipe[]).map(r => r.user_id))]

          // Fetch authors
          const authorMap = new Map<string, { username: string | null }>()
          if (userIds.length > 0) {
            const { data: users } = await from('users')
              .select('id, username')
              .in('id', userIds)

            if (users) {
              for (const u of users as Pick<DbUser, 'id' | 'username'>[]) {
                authorMap.set(u.id, { username: u.username })
              }
            }
          }

          // Sort recipes by their order in collection_recipes and add author info
          const orderMap = new Map<number, number>(
            collectionRecipes.map(cr => [cr.recipe_id, cr.sort_order])
          )
          recipes = (recipeData as DbRecipe[])
            .map(r => ({
              ...r,
              author: authorMap.get(r.user_id) || null,
            }))
            .sort((a, b) => {
              const orderA = orderMap.get(a.id) ?? 0
              const orderB = orderMap.get(b.id) ?? 0
              return orderA - orderB
            })
        }
      }

      return {
        data: {
          ...collection,
          recipes,
          recipe_count: recipes.length,
        },
        error: null,
      }
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error('Failed to fetch collection') }
    }
  }

  /**
   * Create a new collection
   */
  async function createCollection(
    input: CollectionCreateInput
  ): Promise<{ data: DbCollection | null; error: Error | null }> {
    if (!user.value?.id) {
      return { data: null, error: new Error('Not authenticated') }
    }

    try {
      const { data, error } = await from('collections')
        .insert({
          user_id: user.value.id,
          name: input.name,
          slug: input.slug,
          description: input.description ?? null,
          is_public: input.is_public ?? false,
          cover_photo: input.cover_photo ?? null,
        })
        .select()
        .single()

      if (error) {
        return { data: null, error }
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error('Failed to create collection') }
    }
  }

  /**
   * Update an existing collection
   * Only the owner can update a collection
   */
  async function updateCollection(
    collectionId: number,
    input: Partial<CollectionCreateInput>
  ): Promise<{ data: DbCollection | null; error: Error | null }> {
    if (!user.value?.id) {
      return { data: null, error: new Error('Not authenticated') }
    }

    try {
      // Verify ownership first
      const { data: existing, error: fetchError } = await from('collections')
        .select('*')
        .eq('id', collectionId)
        .eq('user_id', user.value.id)
        .single()

      if (fetchError || !existing) {
        return { data: null, error: new Error('Collection not found or not authorized') }
      }

      // Build update object with only provided fields
      const updateData: Record<string, unknown> = {}
      if (input.name !== undefined) updateData.name = input.name
      if (input.slug !== undefined) updateData.slug = input.slug
      if (input.description !== undefined) updateData.description = input.description
      if (input.is_public !== undefined) updateData.is_public = input.is_public
      if (input.cover_photo !== undefined) updateData.cover_photo = input.cover_photo

      const { data, error } = await from('collections')
        .update(updateData)
        .eq('id', collectionId)
        .eq('user_id', user.value.id)
        .select()
        .single()

      if (error) {
        return { data: null, error }
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error('Failed to update collection') }
    }
  }

  /**
   * Delete a collection
   * Only the owner can delete a collection
   */
  async function deleteCollection(
    collectionId: number
  ): Promise<{ error: Error | null }> {
    if (!user.value?.id) {
      return { error: new Error('Not authenticated') }
    }

    try {
      // Verify ownership and delete in one query
      const { error } = await from('collections')
        .delete()
        .eq('id', collectionId)
        .eq('user_id', user.value.id)

      if (error) {
        return { error }
      }

      return { error: null }
    } catch (error) {
      return { error: error instanceof Error ? error : new Error('Failed to delete collection') }
    }
  }

  /**
   * Add a recipe to a collection
   * Only the collection owner can add recipes
   */
  async function addRecipeToCollection(
    collectionId: number,
    recipeId: number
  ): Promise<{ data: DbCollectionRecipe | null; error: Error | null }> {
    if (!user.value?.id) {
      return { data: null, error: new Error('Not authenticated') }
    }

    try {
      // Verify collection ownership
      const { data: collection, error: collectionError } = await from('collections')
        .select('id')
        .eq('id', collectionId)
        .eq('user_id', user.value.id)
        .single()

      if (collectionError || !collection) {
        return { data: null, error: new Error('Collection not found or not authorized') }
      }

      // Get current max sort order
      const { data: existing, error: existingError } = await from('collection_recipes')
        .select('sort_order')
        .eq('collection_id', collectionId)
        .order('sort_order', { ascending: false })
        .limit(1)

      if (existingError) {
        return { data: null, error: existingError }
      }

      const nextSortOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0

      // Add recipe to collection
      const { data, error } = await from('collection_recipes')
        .insert({
          collection_id: collectionId,
          recipe_id: recipeId,
          sort_order: nextSortOrder,
        })
        .select()
        .single()

      if (error) {
        return { data: null, error }
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error('Failed to add recipe to collection') }
    }
  }

  /**
   * Remove a recipe from a collection
   * Only the collection owner can remove recipes
   */
  async function removeRecipeFromCollection(
    collectionId: number,
    recipeId: number
  ): Promise<{ error: Error | null }> {
    if (!user.value?.id) {
      return { error: new Error('Not authenticated') }
    }

    try {
      // Verify collection ownership
      const { data: collection, error: collectionError } = await from('collections')
        .select('id')
        .eq('id', collectionId)
        .eq('user_id', user.value.id)
        .single()

      if (collectionError || !collection) {
        return { error: new Error('Collection not found or not authorized') }
      }

      // Remove recipe from collection
      const { error } = await from('collection_recipes')
        .delete()
        .eq('collection_id', collectionId)
        .eq('recipe_id', recipeId)

      if (error) {
        return { error }
      }

      return { error: null }
    } catch (error) {
      return { error: error instanceof Error ? error : new Error('Failed to remove recipe from collection') }
    }
  }

  /**
   * Reorder recipes within a collection
   * Only the collection owner can reorder recipes
   * @param recipeIds Array of recipe IDs in the desired order
   */
  async function reorderCollectionRecipes(
    collectionId: number,
    recipeIds: number[]
  ): Promise<{ error: Error | null }> {
    if (!user.value?.id) {
      return { error: new Error('Not authenticated') }
    }

    try {
      // Verify collection ownership
      const { data: collection, error: collectionError } = await from('collections')
        .select('id')
        .eq('id', collectionId)
        .eq('user_id', user.value.id)
        .single()

      if (collectionError || !collection) {
        return { error: new Error('Collection not found or not authorized') }
      }

      // Update sort_order for each recipe
      // Note: PostgREST doesn't support bulk updates with different values,
      // so we need to update each recipe individually
      for (let i = 0; i < recipeIds.length; i++) {
        const { error } = await from('collection_recipes')
          .update({ sort_order: i })
          .eq('collection_id', collectionId)
          .eq('recipe_id', recipeIds[i])

        if (error) {
          return { error }
        }
      }

      return { error: null }
    } catch (error) {
      return { error: error instanceof Error ? error : new Error('Failed to reorder recipes') }
    }
  }

  return {
    getMyCollections,
    getCollectionBySlug,
    getCollectionById,
    createCollection,
    updateCollection,
    deleteCollection,
    addRecipeToCollection,
    removeRecipeFromCollection,
    reorderCollectionRecipes,
  }
}
