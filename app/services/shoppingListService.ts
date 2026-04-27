import type { DbShoppingList, DbShoppingItem } from '~/types/database'

// Types for shopping list operations
export interface ShoppingListWithItems extends DbShoppingList {
  items: DbShoppingItem[]
  checked_count: number
  total_count: number
}

export interface ShoppingListCreateInput {
  name: string
  slug: string
}

export interface ShoppingItemCreateInput {
  item: string
  amount?: string | null
  unit?: string | null
  section?: string | null
  recipe_id?: number | null
}

export interface ShoppingItemUpdateInput extends ShoppingItemCreateInput {
  checked?: boolean
}

/**
 * Service for shopping list operations
 *
 * All operations require authentication. Uses the Neon Data API
 * via useNeonData() for database access.
 */
export function useShoppingListService() {
  const { from } = useNeonData()
  const { user, isAuthenticated } = useAuth()

  /**
   * Ensure user is authenticated before performing operations
   */
  function requireAuth(): string {
    if (!isAuthenticated.value || !user.value) {
      throw new Error('Authentication required')
    }
    return user.value.id
  }

  /**
   * Get all shopping lists for the current user with item counts
   */
  async function getShoppingLists(): Promise<ShoppingListWithItems[]> {
    const userId = requireAuth()

    // Fetch all lists for this user
    const { data: lists, error: listsError } = await from('shopping_lists')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (listsError) {
      throw new Error(`Failed to fetch shopping lists: ${listsError.message}`)
    }

    if (!lists || lists.length === 0) {
      return []
    }

    // Fetch all items for all lists in one query
    const listIds = lists.map((l: DbShoppingList) => l.id)
    const { data: allItems, error: itemsError } = await from('shopping_items')
      .select('*')
      .in('list_id', listIds)

    if (itemsError) {
      throw new Error(`Failed to fetch shopping items: ${itemsError.message}`)
    }

    // Group items by list and calculate counts
    const itemsByList = new Map<number, DbShoppingItem[]>()
    for (const item of allItems || []) {
      const existing = itemsByList.get(item.list_id) || []
      existing.push(item)
      itemsByList.set(item.list_id, existing)
    }

    // Map lists to include items and counts
    return lists.map((list: DbShoppingList) => {
      const items = itemsByList.get(list.id) || []
      const checkedCount = items.filter((i: DbShoppingItem) => i.checked).length
      return {
        ...list,
        items,
        checked_count: checkedCount,
        total_count: items.length,
      }
    })
  }

  /**
   * Get a shopping list by slug with all items
   */
  async function getShoppingListBySlug(slug: string): Promise<ShoppingListWithItems | null> {
    const userId = requireAuth()

    // Fetch the list
    const { data: list, error: listError } = await from('shopping_lists')
      .select('*')
      .eq('user_id', userId)
      .eq('slug', slug)
      .maybeSingle()

    if (listError) {
      throw new Error(`Failed to fetch shopping list: ${listError.message}`)
    }

    if (!list) {
      return null
    }

    // Fetch items for this list
    const { data: items, error: itemsError } = await from('shopping_items')
      .select('*')
      .eq('list_id', list.id)
      .order('sort_order', { ascending: true })

    if (itemsError) {
      throw new Error(`Failed to fetch shopping items: ${itemsError.message}`)
    }

    const checkedCount = (items || []).filter((i: DbShoppingItem) => i.checked).length

    return {
      ...list,
      items: items || [],
      checked_count: checkedCount,
      total_count: items?.length || 0,
    }
  }

  /**
   * Get a shopping list by ID with all items
   */
  async function getShoppingListById(id: number): Promise<ShoppingListWithItems | null> {
    const userId = requireAuth()

    // Fetch the list
    const { data: list, error: listError } = await from('shopping_lists')
      .select('*')
      .eq('user_id', userId)
      .eq('id', id)
      .maybeSingle()

    if (listError) {
      throw new Error(`Failed to fetch shopping list: ${listError.message}`)
    }

    if (!list) {
      return null
    }

    // Fetch items for this list
    const { data: items, error: itemsError } = await from('shopping_items')
      .select('*')
      .eq('list_id', list.id)
      .order('sort_order', { ascending: true })

    if (itemsError) {
      throw new Error(`Failed to fetch shopping items: ${itemsError.message}`)
    }

    const checkedCount = (items || []).filter((i: DbShoppingItem) => i.checked).length

    return {
      ...list,
      items: items || [],
      checked_count: checkedCount,
      total_count: items?.length || 0,
    }
  }

  /**
   * Create a new shopping list
   */
  async function createShoppingList(
    input: ShoppingListCreateInput
  ): Promise<DbShoppingList> {
    const userId = requireAuth()

    const { data, error } = await from('shopping_lists')
      .insert({
        user_id: userId,
        name: input.name,
        slug: input.slug,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create shopping list: ${error.message}`)
    }

    return data
  }

  /**
   * Update an existing shopping list
   */
  async function updateShoppingList(
    listId: number,
    input: Partial<ShoppingListCreateInput>
  ): Promise<DbShoppingList> {
    const userId = requireAuth()

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {}
    if (input.name !== undefined) updateData.name = input.name
    if (input.slug !== undefined) updateData.slug = input.slug

    const { data, error } = await from('shopping_lists')
      .update(updateData)
      .eq('id', listId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update shopping list: ${error.message}`)
    }

    return data
  }

  /**
   * Delete a shopping list and all its items
   */
  async function deleteShoppingList(listId: number): Promise<void> {
    const userId = requireAuth()

    const { error } = await from('shopping_lists')
      .delete()
      .eq('id', listId)
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to delete shopping list: ${error.message}`)
    }
  }

  /**
   * Add an item to a shopping list
   */
  async function addItem(
    listId: number,
    input: ShoppingItemCreateInput
  ): Promise<DbShoppingItem> {
    requireAuth()

    // Get the max sort_order for this list to append at the end
    const { data: existingItems } = await from('shopping_items')
      .select('sort_order')
      .eq('list_id', listId)
      .order('sort_order', { ascending: false })
      .limit(1)

    const maxSortOrder = existingItems?.[0]?.sort_order ?? -1
    const newSortOrder = maxSortOrder + 1

    const { data, error } = await from('shopping_items')
      .insert({
        list_id: listId,
        item: input.item,
        amount: input.amount ?? null,
        unit: input.unit ?? null,
        section: input.section ?? null,
        recipe_id: input.recipe_id ?? null,
        checked: false,
        sort_order: newSortOrder,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to add shopping item: ${error.message}`)
    }

    return data
  }

  /**
   * Update a shopping item
   */
  async function updateItem(
    itemId: number,
    input: Partial<ShoppingItemUpdateInput>
  ): Promise<DbShoppingItem> {
    requireAuth()

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {}
    if (input.item !== undefined) updateData.item = input.item
    if (input.amount !== undefined) updateData.amount = input.amount
    if (input.unit !== undefined) updateData.unit = input.unit
    if (input.section !== undefined) updateData.section = input.section
    if (input.recipe_id !== undefined) updateData.recipe_id = input.recipe_id
    if (input.checked !== undefined) updateData.checked = input.checked

    const { data, error } = await from('shopping_items')
      .update(updateData)
      .eq('id', itemId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update shopping item: ${error.message}`)
    }

    return data
  }

  /**
   * Delete a shopping item
   */
  async function deleteItem(itemId: number): Promise<void> {
    requireAuth()

    const { error } = await from('shopping_items').delete().eq('id', itemId)

    if (error) {
      throw new Error(`Failed to delete shopping item: ${error.message}`)
    }
  }

  /**
   * Toggle the checked state of a shopping item
   */
  async function toggleItemChecked(itemId: number): Promise<DbShoppingItem> {
    requireAuth()

    // First get current state
    const { data: currentItem, error: fetchError } = await from('shopping_items')
      .select('checked')
      .eq('id', itemId)
      .single()

    if (fetchError) {
      throw new Error(`Failed to fetch shopping item: ${fetchError.message}`)
    }

    // Toggle the checked state
    const { data, error } = await from('shopping_items')
      .update({ checked: !currentItem.checked })
      .eq('id', itemId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to toggle shopping item: ${error.message}`)
    }

    return data
  }

  return {
    getShoppingLists,
    getShoppingListBySlug,
    getShoppingListById,
    createShoppingList,
    updateShoppingList,
    deleteShoppingList,
    addItem,
    updateItem,
    deleteItem,
    toggleItemChecked,
  }
}
