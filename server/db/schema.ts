import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  decimal,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ============================================
// USERS
// ============================================

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  avatar: text('avatar'),
  bio: text('bio'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const usersRelations = relations(users, ({ many }) => ({
  recipes: many(recipes),
  favorites: many(favorites),
  collections: many(collections),
  comments: many(comments),
  followers: many(follows, { relationName: 'following' }),
  following: many(follows, { relationName: 'followers' }),
}))

// ============================================
// RECIPES
// ============================================

export const recipes = pgTable(
  'recipes',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    coverPhoto: text('cover_photo'),
    prepTime: integer('prep_time'), // minutes
    cookTime: integer('cook_time'), // minutes
    servings: integer('servings').default(4),
    isPublished: boolean('is_published').default(false),

    // Source attribution for imported recipes
    sourceUrl: text('source_url'),
    sourceAuthor: varchar('source_author', { length: 255 }),
    sourceSite: varchar('source_site', { length: 255 }),

    // Forking - self-reference handled via integer only, relation defined separately
    forkedFromId: integer('forked_from_id'),

    // Ratings (aggregated)
    avgTasteRating: decimal('avg_taste_rating', { precision: 3, scale: 2 }),
    avgDifficultyRating: decimal('avg_difficulty_rating', {
      precision: 3,
      scale: 2,
    }),
    ratingCount: integer('rating_count').default(0),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('recipes_user_id_idx').on(table.userId)]
)

export const recipesRelations = relations(recipes, ({ one, many }) => ({
  author: one(users, {
    fields: [recipes.userId],
    references: [users.id],
  }),
  forkedFrom: one(recipes, {
    fields: [recipes.forkedFromId],
    references: [recipes.id],
    relationName: 'forks',
  }),
  forks: many(recipes, { relationName: 'forks' }),
  ingredients: many(ingredients),
  instructions: many(instructions),
  categories: many(recipeCategories),
  tags: many(recipeTags),
  favorites: many(favorites),
  comments: many(comments),
}))

// ============================================
// INGREDIENTS
// ============================================

export const ingredients = pgTable(
  'ingredients',
  {
    id: serial('id').primaryKey(),
    recipeId: integer('recipe_id')
      .references(() => recipes.id, { onDelete: 'cascade' })
      .notNull(),
    amount: decimal('amount', { precision: 10, scale: 3 }),
    unit: varchar('unit', { length: 50 }),
    item: varchar('item', { length: 255 }).notNull(),
    notes: text('notes'),
    sortOrder: integer('sort_order').default(0),
  },
  (table) => [index('ingredients_recipe_id_idx').on(table.recipeId)]
)

export const ingredientsRelations = relations(ingredients, ({ one }) => ({
  recipe: one(recipes, {
    fields: [ingredients.recipeId],
    references: [recipes.id],
  }),
}))

// ============================================
// INSTRUCTIONS
// ============================================

export const instructions = pgTable(
  'instructions',
  {
    id: serial('id').primaryKey(),
    recipeId: integer('recipe_id')
      .references(() => recipes.id, { onDelete: 'cascade' })
      .notNull(),
    stepNumber: integer('step_number').notNull(),
    content: text('content').notNull(),
    timerMinutes: integer('timer_minutes'),
    photo: text('photo'),
  },
  (table) => [index('instructions_recipe_id_idx').on(table.recipeId)]
)

export const instructionsRelations = relations(instructions, ({ one }) => ({
  recipe: one(recipes, {
    fields: [instructions.recipeId],
    references: [recipes.id],
  }),
}))

// ============================================
// CATEGORIES (Global)
// ============================================

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  icon: varchar('icon', { length: 50 }),
})

export const recipeCategories = pgTable(
  'recipe_categories',
  {
    recipeId: integer('recipe_id')
      .references(() => recipes.id, { onDelete: 'cascade' })
      .notNull(),
    categoryId: integer('category_id')
      .references(() => categories.id, { onDelete: 'cascade' })
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.recipeId, table.categoryId] })]
)

export const recipeCategoriesRelations = relations(
  recipeCategories,
  ({ one }) => ({
    recipe: one(recipes, {
      fields: [recipeCategories.recipeId],
      references: [recipes.id],
    }),
    category: one(categories, {
      fields: [recipeCategories.categoryId],
      references: [categories.id],
    }),
  })
)

// ============================================
// TAGS (User-created)
// ============================================

export const tags = pgTable(
  'tags',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 100 }).notNull(),
  },
  (table) => [index('tags_user_id_idx').on(table.userId)]
)

export const recipeTags = pgTable(
  'recipe_tags',
  {
    recipeId: integer('recipe_id')
      .references(() => recipes.id, { onDelete: 'cascade' })
      .notNull(),
    tagId: integer('tag_id')
      .references(() => tags.id, { onDelete: 'cascade' })
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.recipeId, table.tagId] })]
)

export const recipeTagsRelations = relations(recipeTags, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeTags.recipeId],
    references: [recipes.id],
  }),
  tag: one(tags, {
    fields: [recipeTags.tagId],
    references: [tags.id],
  }),
}))

// ============================================
// COLLECTIONS (Cookbooks)
// ============================================

export const collections = pgTable(
  'collections',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    isPublic: boolean('is_public').default(false),
    coverPhoto: text('cover_photo'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('collections_user_id_idx').on(table.userId)]
)

export const collectionRecipes = pgTable(
  'collection_recipes',
  {
    collectionId: integer('collection_id')
      .references(() => collections.id, { onDelete: 'cascade' })
      .notNull(),
    recipeId: integer('recipe_id')
      .references(() => recipes.id, { onDelete: 'cascade' })
      .notNull(),
    addedAt: timestamp('added_at').defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.collectionId, table.recipeId] })]
)

// ============================================
// SOCIAL: Follows
// ============================================

export const follows = pgTable(
  'follows',
  {
    followerId: integer('follower_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    followingId: integer('following_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.followerId, table.followingId] })]
)

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, {
    fields: [follows.followerId],
    references: [users.id],
    relationName: 'following',
  }),
  following: one(users, {
    fields: [follows.followingId],
    references: [users.id],
    relationName: 'followers',
  }),
}))

// ============================================
// SOCIAL: Favorites
// ============================================

export const favorites = pgTable(
  'favorites',
  {
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    recipeId: integer('recipe_id')
      .references(() => recipes.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.recipeId] })]
)

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, {
    fields: [favorites.userId],
    references: [users.id],
  }),
  recipe: one(recipes, {
    fields: [favorites.recipeId],
    references: [recipes.id],
  }),
}))

// ============================================
// SOCIAL: Comments & Ratings
// ============================================

export const comments = pgTable(
  'comments',
  {
    id: serial('id').primaryKey(),
    recipeId: integer('recipe_id')
      .references(() => recipes.id, { onDelete: 'cascade' })
      .notNull(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    content: text('content').notNull(),
    photo: text('photo'),
    tasteRating: integer('taste_rating'), // 1-5
    difficultyRating: integer('difficulty_rating'), // 1-5
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('comments_recipe_id_idx').on(table.recipeId)]
)

export const commentsRelations = relations(comments, ({ one }) => ({
  recipe: one(recipes, {
    fields: [comments.recipeId],
    references: [recipes.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
}))

// ============================================
// MEAL PLANNING
// ============================================

export const mealPlans = pgTable(
  'meal_plans',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    recipeId: integer('recipe_id')
      .references(() => recipes.id, { onDelete: 'cascade' })
      .notNull(),
    date: timestamp('date').notNull(),
    mealType: varchar('meal_type', { length: 20 }).notNull(), // breakfast, lunch, dinner, snack
    servings: integer('servings').default(4),
  },
  (table) => [
    index('meal_plans_user_id_idx').on(table.userId),
    index('meal_plans_date_idx').on(table.date),
  ]
)

// ============================================
// SHOPPING LISTS
// ============================================

export const shoppingLists = pgTable(
  'shopping_lists',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('shopping_lists_user_id_idx').on(table.userId)]
)

export const shoppingItems = pgTable(
  'shopping_items',
  {
    id: serial('id').primaryKey(),
    listId: integer('list_id')
      .references(() => shoppingLists.id, { onDelete: 'cascade' })
      .notNull(),
    recipeId: integer('recipe_id').references(() => recipes.id, {
      onDelete: 'set null',
    }),
    item: varchar('item', { length: 255 }).notNull(),
    amount: decimal('amount', { precision: 10, scale: 3 }),
    unit: varchar('unit', { length: 50 }),
    section: varchar('section', { length: 100 }), // produce, dairy, meat, pantry, etc.
    checked: boolean('checked').default(false),
  },
  (table) => [index('shopping_items_list_id_idx').on(table.listId)]
)

// ============================================
// TYPE EXPORTS
// ============================================

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Recipe = typeof recipes.$inferSelect
export type NewRecipe = typeof recipes.$inferInsert
export type Ingredient = typeof ingredients.$inferSelect
export type NewIngredient = typeof ingredients.$inferInsert
export type Instruction = typeof instructions.$inferSelect
export type NewInstruction = typeof instructions.$inferInsert
export type Category = typeof categories.$inferSelect
export type Collection = typeof collections.$inferSelect
export type Comment = typeof comments.$inferSelect
