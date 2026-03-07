import { db, recipes, collections, shoppingLists } from '../db'
import { eq, and, ne, like } from 'drizzle-orm'

/**
 * Generates a URL-safe slug from a title string.
 * Converts to lowercase, replaces non-alphanumeric characters with hyphens,
 * removes leading/trailing hyphens, and truncates to 100 characters.
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100)
}

/**
 * Generates a URL-safe username from a name string.
 * Similar to slug generation but with stricter rules for usernames.
 */
export function generateUsername(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50)
}

/**
 * Gets a unique slug for a recipe, handling collisions by appending numbers.
 * If the base slug is "chocolate-chip-cookies" and it already exists for this user,
 * it will try "chocolate-chip-cookies-2", "chocolate-chip-cookies-3", etc.
 *
 * @param userId - The user's ID
 * @param title - The recipe title to generate a slug from
 * @param excludeRecipeId - Optional recipe ID to exclude (for updates)
 */
export async function getUniqueSlug(
  userId: string,
  title: string,
  excludeRecipeId?: number
): Promise<string> {
  const baseSlug = generateSlug(title)

  if (!baseSlug) {
    // Fallback for edge case where title produces empty slug
    return `recipe-${Date.now()}`
  }

  // Find all existing slugs that start with the base slug for this user
  const existingSlugs = await db
    .select({ slug: recipes.slug })
    .from(recipes)
    .where(
      excludeRecipeId
        ? and(
            eq(recipes.userId, userId),
            like(recipes.slug, `${baseSlug}%`),
            ne(recipes.id, excludeRecipeId)
          )
        : and(eq(recipes.userId, userId), like(recipes.slug, `${baseSlug}%`))
    )

  const slugSet = new Set(existingSlugs.map((r) => r.slug))

  // If base slug is available, use it
  if (!slugSet.has(baseSlug)) {
    return baseSlug
  }

  // Find the next available number suffix
  let counter = 2
  while (slugSet.has(`${baseSlug}-${counter}`)) {
    counter++
  }

  return `${baseSlug}-${counter}`
}

/**
 * Gets a unique username, handling collisions by appending numbers.
 *
 * @param name - The name to generate a username from
 * @param excludeUserId - Optional user ID to exclude (for updates)
 */
export async function getUniqueUsername(
  name: string,
  excludeUserId?: string
): Promise<string> {
  const { users } = await import('../db')

  const baseUsername = generateUsername(name)

  if (!baseUsername) {
    // Fallback for edge case where name produces empty username
    return `user-${Date.now()}`
  }

  // Find all existing usernames that start with the base username
  const existingUsernames = await db
    .select({ username: users.username })
    .from(users)
    .where(
      excludeUserId
        ? and(
            like(users.username, `${baseUsername}%`),
            ne(users.id, excludeUserId)
          )
        : like(users.username, `${baseUsername}%`)
    )

  const usernameSet = new Set(
    existingUsernames.map((u) => u.username).filter(Boolean)
  )

  // If base username is available, use it
  if (!usernameSet.has(baseUsername)) {
    return baseUsername
  }

  // Find the next available number suffix
  let counter = 2
  while (usernameSet.has(`${baseUsername}-${counter}`)) {
    counter++
  }

  return `${baseUsername}-${counter}`
}

/**
 * Gets a unique slug for a collection, handling collisions by appending numbers.
 *
 * @param userId - The user's ID
 * @param name - The collection name to generate a slug from
 * @param excludeCollectionId - Optional collection ID to exclude (for updates)
 */
export async function getUniqueCollectionSlug(
  userId: string,
  name: string,
  excludeCollectionId?: number
): Promise<string> {
  const baseSlug = generateSlug(name)

  if (!baseSlug) {
    return `collection-${Date.now()}`
  }

  const existingSlugs = await db
    .select({ slug: collections.slug })
    .from(collections)
    .where(
      excludeCollectionId
        ? and(
            eq(collections.userId, userId),
            like(collections.slug, `${baseSlug}%`),
            ne(collections.id, excludeCollectionId)
          )
        : and(eq(collections.userId, userId), like(collections.slug, `${baseSlug}%`))
    )

  const slugSet = new Set(existingSlugs.map((c) => c.slug))

  if (!slugSet.has(baseSlug)) {
    return baseSlug
  }

  let counter = 2
  while (slugSet.has(`${baseSlug}-${counter}`)) {
    counter++
  }

  return `${baseSlug}-${counter}`
}

/**
 * Gets a unique slug for a shopping list, handling collisions by appending numbers.
 *
 * @param userId - The user's ID
 * @param name - The shopping list name to generate a slug from
 * @param excludeListId - Optional list ID to exclude (for updates)
 */
export async function getUniqueShoppingListSlug(
  userId: string,
  name: string,
  excludeListId?: number
): Promise<string> {
  const baseSlug = generateSlug(name)

  if (!baseSlug) {
    return `list-${Date.now()}`
  }

  const existingSlugs = await db
    .select({ slug: shoppingLists.slug })
    .from(shoppingLists)
    .where(
      excludeListId
        ? and(
            eq(shoppingLists.userId, userId),
            like(shoppingLists.slug, `${baseSlug}%`),
            ne(shoppingLists.id, excludeListId)
          )
        : and(eq(shoppingLists.userId, userId), like(shoppingLists.slug, `${baseSlug}%`))
    )

  const slugSet = new Set(existingSlugs.map((l) => l.slug))

  if (!slugSet.has(baseSlug)) {
    return baseSlug
  }

  let counter = 2
  while (slugSet.has(`${baseSlug}-${counter}`)) {
    counter++
  }

  return `${baseSlug}-${counter}`
}
