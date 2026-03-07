/**
 * Migration script to generate usernames for existing users
 * and slugs for existing recipes.
 *
 * Run with: npx tsx scripts/migrate-slugs.ts
 *
 * This script is idempotent - it only sets values where they are null.
 */
import 'dotenv/config'
import { drizzle } from 'drizzle-orm/neon-serverless'
import { Pool, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'
import { eq, isNull, like, and, ne } from 'drizzle-orm'
import * as schema from '../server/db/schema'

// Configure WebSocket for Node.js environment
neonConfig.webSocketConstructor = ws

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is required')
    process.exit(1)
  }

  console.log('Connecting to database...')
  const pool = new Pool({ connectionString })
  const db = drizzle(pool, { schema })

  try {
    // Step 1: Generate usernames for users without one
    console.log('\n=== Generating usernames for users ===')
    const usersWithoutUsername = await db
      .select()
      .from(schema.users)
      .where(isNull(schema.users.username))

    console.log(`Found ${usersWithoutUsername.length} users without username`)

    for (const user of usersWithoutUsername) {
      const username = await generateUniqueUsername(db, user.name, user.id)
      await db
        .update(schema.users)
        .set({ username })
        .where(eq(schema.users.id, user.id))
      console.log(`  User "${user.name}" -> username: ${username}`)
    }

    // Step 2: Generate slugs for recipes without one
    console.log('\n=== Generating slugs for recipes ===')

    // Check for recipes that might have empty slug
    const allRecipes = await db.select().from(schema.recipes)
    const recipesToMigrate = allRecipes.filter(
      (r) => !r.slug || r.slug.trim() === ''
    )

    console.log(`Found ${recipesToMigrate.length} recipes without slug`)

    for (const recipe of recipesToMigrate) {
      const slug = await generateUniqueSlug(
        db,
        recipe.userId,
        recipe.title,
        recipe.id
      )
      await db
        .update(schema.recipes)
        .set({ slug })
        .where(eq(schema.recipes.id, recipe.id))
      console.log(`  Recipe "${recipe.title}" -> slug: ${slug}`)
    }

    console.log('\n=== Migration complete ===')

    // Step 3: Generate slugs for collections without one
    console.log('\n=== Generating slugs for collections ===')

    const allCollections = await db.select().from(schema.collections)
    const collectionsToMigrate = allCollections.filter(
      (c) => !c.slug || c.slug.trim() === ''
    )

    console.log(`Found ${collectionsToMigrate.length} collections without slug`)

    for (const collection of collectionsToMigrate) {
      const slug = await generateUniqueCollectionSlug(
        db,
        collection.userId,
        collection.name,
        collection.id
      )
      await db
        .update(schema.collections)
        .set({ slug })
        .where(eq(schema.collections.id, collection.id))
      console.log(`  Collection "${collection.name}" -> slug: ${slug}`)
    }

    // Step 4: Generate slugs for shopping lists without one
    console.log('\n=== Generating slugs for shopping lists ===')

    const allShoppingLists = await db.select().from(schema.shoppingLists)
    const shoppingListsToMigrate = allShoppingLists.filter(
      (l) => !l.slug || l.slug.trim() === ''
    )

    console.log(`Found ${shoppingListsToMigrate.length} shopping lists without slug`)

    for (const list of shoppingListsToMigrate) {
      const slug = await generateUniqueShoppingListSlug(
        db,
        list.userId,
        list.name,
        list.id
      )
      await db
        .update(schema.shoppingLists)
        .set({ slug })
        .where(eq(schema.shoppingLists.id, list.id))
      console.log(`  Shopping list "${list.name}" -> slug: ${slug}`)
    }

    console.log('\n=== Migration complete ===')

    // Summary
    const finalUsers = await db.select().from(schema.users)
    const finalRecipes = await db.select().from(schema.recipes)
    const finalCollections = await db.select().from(schema.collections)
    const finalShoppingLists = await db.select().from(schema.shoppingLists)

    const usersWithUsername = finalUsers.filter((u) => u.username)
    const recipesWithSlug = finalRecipes.filter((r) => r.slug)
    const collectionsWithSlug = finalCollections.filter((c) => c.slug)
    const shoppingListsWithSlug = finalShoppingLists.filter((l) => l.slug)

    console.log(`\nSummary:`)
    console.log(
      `  Users with username: ${usersWithUsername.length}/${finalUsers.length}`
    )
    console.log(
      `  Recipes with slug: ${recipesWithSlug.length}/${finalRecipes.length}`
    )
    console.log(
      `  Collections with slug: ${collectionsWithSlug.length}/${finalCollections.length}`
    )
    console.log(
      `  Shopping lists with slug: ${shoppingListsWithSlug.length}/${finalShoppingLists.length}`
    )
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

/**
 * Generate a URL-safe slug from a title string.
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100)
}

/**
 * Generate a URL-safe username from a name string.
 */
function generateUsername(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50)
}

/**
 * Get a unique slug for a recipe, handling collisions.
 */
async function generateUniqueSlug(
  db: ReturnType<typeof drizzle>,
  userId: string,
  title: string,
  excludeRecipeId?: number
): Promise<string> {
  const baseSlug = generateSlug(title)

  if (!baseSlug) {
    return `recipe-${Date.now()}`
  }

  const existingSlugs = await db
    .select({ slug: schema.recipes.slug })
    .from(schema.recipes)
    .where(
      excludeRecipeId
        ? and(
            eq(schema.recipes.userId, userId),
            like(schema.recipes.slug, `${baseSlug}%`),
            ne(schema.recipes.id, excludeRecipeId)
          )
        : and(
            eq(schema.recipes.userId, userId),
            like(schema.recipes.slug, `${baseSlug}%`)
          )
    )

  const slugSet = new Set(existingSlugs.map((r) => r.slug))

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
 * Get a unique username, handling collisions.
 */
async function generateUniqueUsername(
  db: ReturnType<typeof drizzle>,
  name: string,
  excludeUserId?: string
): Promise<string> {
  const baseUsername = generateUsername(name)

  if (!baseUsername) {
    return `user-${Date.now()}`
  }

  const existingUsernames = await db
    .select({ username: schema.users.username })
    .from(schema.users)
    .where(
      excludeUserId
        ? and(
            like(schema.users.username, `${baseUsername}%`),
            ne(schema.users.id, excludeUserId)
          )
        : like(schema.users.username, `${baseUsername}%`)
    )

  const usernameSet = new Set(
    existingUsernames.map((u) => u.username).filter(Boolean)
  )

  if (!usernameSet.has(baseUsername)) {
    return baseUsername
  }

  let counter = 2
  while (usernameSet.has(`${baseUsername}-${counter}`)) {
    counter++
  }

  return `${baseUsername}-${counter}`
}

/**
 * Get a unique slug for a collection, handling collisions.
 */
async function generateUniqueCollectionSlug(
  db: ReturnType<typeof drizzle>,
  userId: string,
  name: string,
  excludeCollectionId?: number
): Promise<string> {
  const baseSlug = generateSlug(name)

  if (!baseSlug) {
    return `collection-${Date.now()}`
  }

  const existingSlugs = await db
    .select({ slug: schema.collections.slug })
    .from(schema.collections)
    .where(
      excludeCollectionId
        ? and(
            eq(schema.collections.userId, userId),
            like(schema.collections.slug, `${baseSlug}%`),
            ne(schema.collections.id, excludeCollectionId)
          )
        : and(
            eq(schema.collections.userId, userId),
            like(schema.collections.slug, `${baseSlug}%`)
          )
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
 * Get a unique slug for a shopping list, handling collisions.
 */
async function generateUniqueShoppingListSlug(
  db: ReturnType<typeof drizzle>,
  userId: string,
  name: string,
  excludeListId?: number
): Promise<string> {
  const baseSlug = generateSlug(name)

  if (!baseSlug) {
    return `list-${Date.now()}`
  }

  const existingSlugs = await db
    .select({ slug: schema.shoppingLists.slug })
    .from(schema.shoppingLists)
    .where(
      excludeListId
        ? and(
            eq(schema.shoppingLists.userId, userId),
            like(schema.shoppingLists.slug, `${baseSlug}%`),
            ne(schema.shoppingLists.id, excludeListId)
          )
        : and(
            eq(schema.shoppingLists.userId, userId),
            like(schema.shoppingLists.slug, `${baseSlug}%`)
          )
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

// Run the migration
main()
