# Cloudflare Pages Migration - Client-Side Neon Data API

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate TwoTeaspoons from server-side Nuxt API endpoints to client-side Neon Data API for static Cloudflare Pages deployment.

**Architecture:** All database operations move to client-side SQL via `neonClient.data.sql()`. Row-Level Security (RLS) enforces access control at the database level. Only 4 endpoints remain as Cloudflare Workers: image upload, avatar upload, recipe import (URL scraping), and PDF export.

**Tech Stack:** Nuxt 4 (SSG), Neon Data API, Neon Auth, Cloudflare Pages, Cloudflare R2

---

## Phase 1: Database Security (RLS Policies)

### Task 1.1: Complete RLS Policies for All Tables

**Files:**
- Modify: `server/db/migrations/0001_add_rls_policies.sql`

**Step 1: Add RLS for `users` table**

```sql
-- Users: Anyone can read, only self can update
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select_policy ON users
    FOR SELECT
    USING (true);

CREATE POLICY users_update_policy ON users
    FOR UPDATE
    USING (id = current_setting('auth.user_id', true))
    WITH CHECK (id = current_setting('auth.user_id', true));

CREATE POLICY users_insert_policy ON users
    FOR INSERT
    WITH CHECK (
        id = current_setting('auth.user_id', true)
        AND current_setting('auth.user_id', true) != ''
    );
```

**Step 2: Add RLS for `ingredients` table (follows parent recipe)**

```sql
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY ingredients_select_policy ON ingredients
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = ingredients.recipe_id
            AND (recipes.is_published = true OR recipes.user_id = current_setting('auth.user_id', true))
        )
    );

CREATE POLICY ingredients_insert_policy ON ingredients
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = ingredients.recipe_id
            AND recipes.user_id = current_setting('auth.user_id', true)
        )
    );

CREATE POLICY ingredients_update_policy ON ingredients
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = ingredients.recipe_id
            AND recipes.user_id = current_setting('auth.user_id', true)
        )
    );

CREATE POLICY ingredients_delete_policy ON ingredients
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = ingredients.recipe_id
            AND recipes.user_id = current_setting('auth.user_id', true)
        )
    );
```

**Step 3: Add RLS for `instructions` table (follows parent recipe)**

```sql
ALTER TABLE instructions ENABLE ROW LEVEL SECURITY;

CREATE POLICY instructions_select_policy ON instructions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = instructions.recipe_id
            AND (recipes.is_published = true OR recipes.user_id = current_setting('auth.user_id', true))
        )
    );

CREATE POLICY instructions_insert_policy ON instructions
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = instructions.recipe_id
            AND recipes.user_id = current_setting('auth.user_id', true)
        )
    );

CREATE POLICY instructions_update_policy ON instructions
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = instructions.recipe_id
            AND recipes.user_id = current_setting('auth.user_id', true)
        )
    );

CREATE POLICY instructions_delete_policy ON instructions
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = instructions.recipe_id
            AND recipes.user_id = current_setting('auth.user_id', true)
        )
    );
```

**Step 4: Add RLS for `categories` (public read-only)**

```sql
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY categories_select_policy ON categories
    FOR SELECT
    USING (true);
```

**Step 5: Add RLS for `recipe_categories` (follows parent recipe)**

```sql
ALTER TABLE recipe_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY recipe_categories_select_policy ON recipe_categories
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = recipe_categories.recipe_id
            AND (recipes.is_published = true OR recipes.user_id = current_setting('auth.user_id', true))
        )
    );

CREATE POLICY recipe_categories_insert_policy ON recipe_categories
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = recipe_categories.recipe_id
            AND recipes.user_id = current_setting('auth.user_id', true)
        )
    );

CREATE POLICY recipe_categories_delete_policy ON recipe_categories
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = recipe_categories.recipe_id
            AND recipes.user_id = current_setting('auth.user_id', true)
        )
    );
```

**Step 6: Add RLS for `tags` (user-owned)**

```sql
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY tags_select_policy ON tags
    FOR SELECT
    USING (user_id = current_setting('auth.user_id', true));

CREATE POLICY tags_insert_policy ON tags
    FOR INSERT
    WITH CHECK (
        user_id = current_setting('auth.user_id', true)
        AND current_setting('auth.user_id', true) != ''
    );

CREATE POLICY tags_update_policy ON tags
    FOR UPDATE
    USING (user_id = current_setting('auth.user_id', true));

CREATE POLICY tags_delete_policy ON tags
    FOR DELETE
    USING (user_id = current_setting('auth.user_id', true));
```

**Step 7: Add RLS for `recipe_tags` (follows parent recipe/tag)**

```sql
ALTER TABLE recipe_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY recipe_tags_select_policy ON recipe_tags
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = recipe_tags.recipe_id
            AND recipes.user_id = current_setting('auth.user_id', true)
        )
    );

CREATE POLICY recipe_tags_insert_policy ON recipe_tags
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = recipe_tags.recipe_id
            AND recipes.user_id = current_setting('auth.user_id', true)
        )
    );

CREATE POLICY recipe_tags_delete_policy ON recipe_tags
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = recipe_tags.recipe_id
            AND recipes.user_id = current_setting('auth.user_id', true)
        )
    );
```

**Step 8: Add RLS for `collection_recipes` (follows parent collection)**

```sql
ALTER TABLE collection_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY collection_recipes_select_policy ON collection_recipes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM collections
            WHERE collections.id = collection_recipes.collection_id
            AND (collections.is_public = true OR collections.user_id = current_setting('auth.user_id', true))
        )
    );

CREATE POLICY collection_recipes_insert_policy ON collection_recipes
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM collections
            WHERE collections.id = collection_recipes.collection_id
            AND collections.user_id = current_setting('auth.user_id', true)
        )
    );

CREATE POLICY collection_recipes_delete_policy ON collection_recipes
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM collections
            WHERE collections.id = collection_recipes.collection_id
            AND collections.user_id = current_setting('auth.user_id', true)
        )
    );
```

**Step 9: Add RLS for `comments` (public read, own user write)**

```sql
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY comments_select_policy ON comments
    FOR SELECT
    USING (true);

CREATE POLICY comments_insert_policy ON comments
    FOR INSERT
    WITH CHECK (
        user_id = current_setting('auth.user_id', true)
        AND current_setting('auth.user_id', true) != ''
    );

CREATE POLICY comments_update_policy ON comments
    FOR UPDATE
    USING (user_id = current_setting('auth.user_id', true));

CREATE POLICY comments_delete_policy ON comments
    FOR DELETE
    USING (user_id = current_setting('auth.user_id', true));
```

**Step 10: Add RLS for `follows` (own user actions)**

```sql
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY follows_select_policy ON follows
    FOR SELECT
    USING (true);

CREATE POLICY follows_insert_policy ON follows
    FOR INSERT
    WITH CHECK (
        follower_id = current_setting('auth.user_id', true)
        AND current_setting('auth.user_id', true) != ''
    );

CREATE POLICY follows_delete_policy ON follows
    FOR DELETE
    USING (follower_id = current_setting('auth.user_id', true));
```

**Step 11: Add RLS for `shopping_items` (follows parent list)**

```sql
ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY shopping_items_select_policy ON shopping_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM shopping_lists
            WHERE shopping_lists.id = shopping_items.list_id
            AND shopping_lists.user_id = current_setting('auth.user_id', true)
        )
    );

CREATE POLICY shopping_items_insert_policy ON shopping_items
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM shopping_lists
            WHERE shopping_lists.id = shopping_items.list_id
            AND shopping_lists.user_id = current_setting('auth.user_id', true)
        )
    );

CREATE POLICY shopping_items_update_policy ON shopping_items
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM shopping_lists
            WHERE shopping_lists.id = shopping_items.list_id
            AND shopping_lists.user_id = current_setting('auth.user_id', true)
        )
    );

CREATE POLICY shopping_items_delete_policy ON shopping_items
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM shopping_lists
            WHERE shopping_lists.id = shopping_items.list_id
            AND shopping_lists.user_id = current_setting('auth.user_id', true)
        )
    );
```

**Step 12: Add RLS for `recipe_slug_history` (follows parent recipe)**

```sql
ALTER TABLE recipe_slug_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY recipe_slug_history_select_policy ON recipe_slug_history
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = recipe_slug_history.recipe_id
            AND (recipes.is_published = true OR recipes.user_id = current_setting('auth.user_id', true))
        )
    );

CREATE POLICY recipe_slug_history_insert_policy ON recipe_slug_history
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = recipe_slug_history.recipe_id
            AND recipes.user_id = current_setting('auth.user_id', true)
        )
    );
```

**Step 13: Update existing policies to use `auth.user_id` setting name**

The existing policies use `app.user_id`. Update them to use `auth.user_id` to match Neon Auth's convention:

```sql
-- Drop and recreate existing policies with new setting name
-- (Full recreation SQL in actual migration file)
```

**Step 14: Commit**

```bash
git add server/db/migrations/0001_add_rls_policies.sql
git commit -m "feat(db): complete RLS policies for all tables"
```

---

## Phase 2: Client-Side Data Layer

### Task 2.1: Create Core Data Composable

**Files:**
- Create: `app/composables/useNeonData.ts`
- Create: `app/types/database.ts`

**Step 1: Create type definitions**

```typescript
// app/types/database.ts
export interface DbRecipe {
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
}

export interface DbIngredient {
  id: number
  recipe_id: number
  amount: string | null
  unit: string | null
  item: string
  notes: string | null
  sort_order: number
}

export interface DbInstruction {
  id: number
  recipe_id: number
  step_number: number
  content: string
  timer_minutes: number | null
  photo: string | null
  ingredient_ids: string | null
}

export interface DbUser {
  id: string
  email: string
  name: string
  username: string | null
  avatar: string | null
  bio: string | null
  created_at: string
  updated_at: string
}

export interface DbCategory {
  id: number
  name: string
  slug: string
  icon: string | null
  type: string
  sort_order: number
}

export interface DbCollection {
  id: number
  user_id: string
  name: string
  slug: string
  description: string | null
  is_public: boolean
  cover_photo: string | null
  created_at: string
}

export interface DbFavorite {
  user_id: string
  recipe_id: number
  created_at: string
}

export interface DbMealPlan {
  id: number
  user_id: string
  recipe_id: number
  date: string
  meal_type: string
  servings: number
}

export interface DbShoppingList {
  id: number
  user_id: string
  name: string
  slug: string
  created_at: string
}

export interface DbShoppingItem {
  id: number
  list_id: number
  recipe_id: number | null
  item: string
  amount: string | null
  unit: string | null
  section: string | null
  checked: boolean
  sort_order: number
}

export interface DbComment {
  id: number
  recipe_id: number
  user_id: string
  content: string
  photo: string | null
  taste_rating: number | null
  difficulty_rating: number | null
  created_at: string
}
```

**Step 2: Create the data composable**

```typescript
// app/composables/useNeonData.ts
import { useNeonClient } from './useNeonClient'
import type {
  DbRecipe,
  DbIngredient,
  DbInstruction,
  DbUser,
  DbCategory,
  DbCollection,
  DbFavorite,
  DbMealPlan,
  DbShoppingList,
  DbShoppingItem,
  DbComment,
} from '~/types/database'

interface SqlQueryResult<T> {
  rows: T[]
}

export function useNeonData() {
  const client = useNeonClient()

  async function sql<T = Record<string, unknown>>(
    query: string,
    params: unknown[] = []
  ): Promise<T[]> {
    const result = await client.data.sql<SqlQueryResult<T>>(query, params)
    return result.rows
  }

  return {
    sql,
    // Re-export for direct use
    client,
  }
}
```

**Step 3: Commit**

```bash
git add app/composables/useNeonData.ts app/types/database.ts
git commit -m "feat: add client-side Neon Data API composable"
```

### Task 2.2: Create Recipe Data Service

**Files:**
- Create: `app/services/recipeService.ts`

**Step 1: Create recipe service with all operations**

```typescript
// app/services/recipeService.ts
import type {
  DbRecipe,
  DbIngredient,
  DbInstruction,
  DbUser,
  DbCategory,
} from '~/types/database'

export interface RecipeWithDetails extends DbRecipe {
  author: DbUser | null
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

export function useRecipeService() {
  const { sql } = useNeonData()
  const { user } = useAuth()

  async function getPublicRecipes(options?: {
    categorySlugs?: string[]
  }): Promise<RecipeWithDetails[]> {
    let query = `
      SELECT 
        r.*,
        u.id as author_id, u.name as author_name, u.username as author_username, u.avatar as author_avatar
      FROM recipes r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.is_published = true
    `
    const params: unknown[] = []

    if (options?.categorySlugs?.length) {
      query += `
        AND r.id IN (
          SELECT rc.recipe_id FROM recipe_categories rc
          JOIN categories c ON rc.category_id = c.id
          WHERE c.slug = ANY($1)
        )
      `
      params.push(options.categorySlugs)
    }

    query += ` ORDER BY r.created_at DESC, r.id DESC`

    const recipes = await sql<DbRecipe & {
      author_id: string | null
      author_name: string | null
      author_username: string | null
      author_avatar: string | null
    }>(query, params)

    // Fetch ingredients, instructions, and categories for all recipes
    const recipeIds = recipes.map(r => r.id)
    if (recipeIds.length === 0) return []

    const [ingredients, instructions, categories, savedRecipeIds] = await Promise.all([
      sql<DbIngredient>(
        `SELECT * FROM ingredients WHERE recipe_id = ANY($1) ORDER BY sort_order`,
        [recipeIds]
      ),
      sql<DbInstruction>(
        `SELECT * FROM instructions WHERE recipe_id = ANY($1) ORDER BY step_number`,
        [recipeIds]
      ),
      sql<DbCategory & { recipe_id: number }>(
        `SELECT c.*, rc.recipe_id 
         FROM categories c
         JOIN recipe_categories rc ON c.id = rc.category_id
         WHERE rc.recipe_id = ANY($1)
         ORDER BY c.type, c.sort_order`,
        [recipeIds]
      ),
      user.value
        ? sql<{ recipe_id: number }>(
            `SELECT recipe_id FROM favorites WHERE recipe_id = ANY($1)`,
            [recipeIds]
          )
        : Promise.resolve([]),
    ])

    const savedIds = new Set(savedRecipeIds.map(s => s.recipe_id))

    return recipes.map(r => ({
      ...r,
      author: r.author_id
        ? {
            id: r.author_id,
            name: r.author_name || '',
            username: r.author_username,
            avatar: r.author_avatar,
            email: '',
            bio: null,
            created_at: '',
            updated_at: '',
          }
        : null,
      ingredients: ingredients.filter(i => i.recipe_id === r.id),
      instructions: instructions.filter(i => i.recipe_id === r.id),
      categories: categories.filter(c => c.recipe_id === r.id),
      is_saved: savedIds.has(r.id),
    }))
  }

  async function getRecipeBySlug(
    username: string,
    slug: string
  ): Promise<RecipeWithDetails | null> {
    const recipes = await sql<DbRecipe & {
      author_id: string | null
      author_name: string | null
      author_username: string | null
      author_avatar: string | null
    }>(
      `SELECT 
        r.*,
        u.id as author_id, u.name as author_name, u.username as author_username, u.avatar as author_avatar
       FROM recipes r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE u.username = $1 AND r.slug = $2`,
      [username, slug]
    )

    if (recipes.length === 0) return null
    const recipe = recipes[0]

    const [ingredients, instructions, categories, saved] = await Promise.all([
      sql<DbIngredient>(
        `SELECT * FROM ingredients WHERE recipe_id = $1 ORDER BY sort_order`,
        [recipe.id]
      ),
      sql<DbInstruction>(
        `SELECT * FROM instructions WHERE recipe_id = $1 ORDER BY step_number`,
        [recipe.id]
      ),
      sql<DbCategory>(
        `SELECT c.* FROM categories c
         JOIN recipe_categories rc ON c.id = rc.category_id
         WHERE rc.recipe_id = $1
         ORDER BY c.type, c.sort_order`,
        [recipe.id]
      ),
      user.value
        ? sql<{ recipe_id: number }>(
            `SELECT recipe_id FROM favorites WHERE recipe_id = $1`,
            [recipe.id]
          )
        : Promise.resolve([]),
    ])

    return {
      ...recipe,
      author: recipe.author_id
        ? {
            id: recipe.author_id,
            name: recipe.author_name || '',
            username: recipe.author_username,
            avatar: recipe.author_avatar,
            email: '',
            bio: null,
            created_at: '',
            updated_at: '',
          }
        : null,
      ingredients,
      instructions,
      categories,
      is_saved: saved.length > 0,
    }
  }

  async function createRecipe(input: RecipeCreateInput): Promise<DbRecipe> {
    if (!user.value) throw new Error('Authentication required')

    // Insert recipe
    const [recipe] = await sql<DbRecipe>(
      `INSERT INTO recipes (
        user_id, title, slug, description, cover_photo, prep_time, cook_time,
        servings, is_published, source_url, source_author, source_site, forked_from_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        user.value.id,
        input.title,
        input.slug,
        input.description || null,
        input.cover_photo || null,
        input.prep_time || null,
        input.cook_time || null,
        input.servings || 4,
        input.is_published ?? true,
        input.source_url || null,
        input.source_author || null,
        input.source_site || null,
        input.forked_from_id || null,
      ]
    )

    // Insert ingredients
    if (input.ingredients.length > 0) {
      const ingredientValues = input.ingredients
        .map((_, i) => `($1, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5}, $${i * 5 + 6})`)
        .join(', ')
      const ingredientParams = [recipe.id]
      for (const ing of input.ingredients) {
        ingredientParams.push(ing.amount || null, ing.unit || null, ing.item, ing.notes || null, ing.sort_order)
      }
      await sql(
        `INSERT INTO ingredients (recipe_id, amount, unit, item, notes, sort_order) VALUES ${ingredientValues}`,
        ingredientParams
      )
    }

    // Insert instructions
    if (input.instructions.length > 0) {
      const instructionValues = input.instructions
        .map((_, i) => `($1, $${i * 3 + 2}, $${i * 3 + 3}, $${i * 3 + 4})`)
        .join(', ')
      const instructionParams = [recipe.id]
      for (const inst of input.instructions) {
        instructionParams.push(inst.step_number, inst.content, inst.timer_minutes || null)
      }
      await sql(
        `INSERT INTO instructions (recipe_id, step_number, content, timer_minutes) VALUES ${instructionValues}`,
        instructionParams
      )
    }

    // Insert category associations
    if (input.category_ids?.length) {
      const categoryValues = input.category_ids
        .map((_, i) => `($1, $${i + 2})`)
        .join(', ')
      await sql(
        `INSERT INTO recipe_categories (recipe_id, category_id) VALUES ${categoryValues}`,
        [recipe.id, ...input.category_ids]
      )
    }

    return recipe
  }

  async function updateRecipe(
    recipeId: number,
    input: Partial<RecipeCreateInput>
  ): Promise<DbRecipe> {
    if (!user.value) throw new Error('Authentication required')

    const updates: string[] = []
    const params: unknown[] = []
    let paramIndex = 1

    if (input.title !== undefined) {
      updates.push(`title = $${paramIndex++}`)
      params.push(input.title)
    }
    if (input.slug !== undefined) {
      updates.push(`slug = $${paramIndex++}`)
      params.push(input.slug)
    }
    if (input.description !== undefined) {
      updates.push(`description = $${paramIndex++}`)
      params.push(input.description)
    }
    if (input.cover_photo !== undefined) {
      updates.push(`cover_photo = $${paramIndex++}`)
      params.push(input.cover_photo)
    }
    if (input.prep_time !== undefined) {
      updates.push(`prep_time = $${paramIndex++}`)
      params.push(input.prep_time)
    }
    if (input.cook_time !== undefined) {
      updates.push(`cook_time = $${paramIndex++}`)
      params.push(input.cook_time)
    }
    if (input.servings !== undefined) {
      updates.push(`servings = $${paramIndex++}`)
      params.push(input.servings)
    }
    if (input.is_published !== undefined) {
      updates.push(`is_published = $${paramIndex++}`)
      params.push(input.is_published)
    }

    updates.push(`updated_at = NOW()`)
    params.push(recipeId)

    const [recipe] = await sql<DbRecipe>(
      `UPDATE recipes SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    )

    // Update ingredients if provided
    if (input.ingredients !== undefined) {
      await sql(`DELETE FROM ingredients WHERE recipe_id = $1`, [recipeId])
      if (input.ingredients.length > 0) {
        const ingredientValues = input.ingredients
          .map((_, i) => `($1, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5}, $${i * 5 + 6})`)
          .join(', ')
        const ingredientParams = [recipeId]
        for (const ing of input.ingredients) {
          ingredientParams.push(ing.amount || null, ing.unit || null, ing.item, ing.notes || null, ing.sort_order)
        }
        await sql(
          `INSERT INTO ingredients (recipe_id, amount, unit, item, notes, sort_order) VALUES ${ingredientValues}`,
          ingredientParams
        )
      }
    }

    // Update instructions if provided
    if (input.instructions !== undefined) {
      await sql(`DELETE FROM instructions WHERE recipe_id = $1`, [recipeId])
      if (input.instructions.length > 0) {
        const instructionValues = input.instructions
          .map((_, i) => `($1, $${i * 3 + 2}, $${i * 3 + 3}, $${i * 3 + 4})`)
          .join(', ')
        const instructionParams = [recipeId]
        for (const inst of input.instructions) {
          instructionParams.push(inst.step_number, inst.content, inst.timer_minutes || null)
        }
        await sql(
          `INSERT INTO instructions (recipe_id, step_number, content, timer_minutes) VALUES ${instructionValues}`,
          instructionParams
        )
      }
    }

    // Update categories if provided
    if (input.category_ids !== undefined) {
      await sql(`DELETE FROM recipe_categories WHERE recipe_id = $1`, [recipeId])
      if (input.category_ids.length > 0) {
        const categoryValues = input.category_ids
          .map((_, i) => `($1, $${i + 2})`)
          .join(', ')
        await sql(
          `INSERT INTO recipe_categories (recipe_id, category_id) VALUES ${categoryValues}`,
          [recipeId, ...input.category_ids]
        )
      }
    }

    return recipe
  }

  async function deleteRecipe(recipeId: number): Promise<void> {
    if (!user.value) throw new Error('Authentication required')
    await sql(`DELETE FROM recipes WHERE id = $1`, [recipeId])
  }

  async function saveRecipe(recipeId: number): Promise<void> {
    if (!user.value) throw new Error('Authentication required')
    await sql(
      `INSERT INTO favorites (user_id, recipe_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [user.value.id, recipeId]
    )
    await sql(
      `UPDATE recipes SET save_count = COALESCE(save_count, 0) + 1 WHERE id = $1`,
      [recipeId]
    )
  }

  async function unsaveRecipe(recipeId: number): Promise<void> {
    if (!user.value) throw new Error('Authentication required')
    await sql(
      `DELETE FROM favorites WHERE user_id = $1 AND recipe_id = $2`,
      [user.value.id, recipeId]
    )
    await sql(
      `UPDATE recipes SET save_count = GREATEST(COALESCE(save_count, 0) - 1, 0) WHERE id = $1`,
      [recipeId]
    )
  }

  async function getMyRecipes(): Promise<RecipeWithDetails[]> {
    if (!user.value) throw new Error('Authentication required')

    const recipes = await sql<DbRecipe>(
      `SELECT * FROM recipes WHERE user_id = $1 ORDER BY created_at DESC`,
      [user.value.id]
    )

    if (recipes.length === 0) return []

    const recipeIds = recipes.map(r => r.id)
    const [ingredients, instructions, categories] = await Promise.all([
      sql<DbIngredient>(
        `SELECT * FROM ingredients WHERE recipe_id = ANY($1) ORDER BY sort_order`,
        [recipeIds]
      ),
      sql<DbInstruction>(
        `SELECT * FROM instructions WHERE recipe_id = ANY($1) ORDER BY step_number`,
        [recipeIds]
      ),
      sql<DbCategory & { recipe_id: number }>(
        `SELECT c.*, rc.recipe_id FROM categories c
         JOIN recipe_categories rc ON c.id = rc.category_id
         WHERE rc.recipe_id = ANY($1)`,
        [recipeIds]
      ),
    ])

    return recipes.map(r => ({
      ...r,
      author: user.value
        ? {
            id: user.value.id,
            name: user.value.name || '',
            username: user.value.username,
            avatar: user.value.avatar,
            email: user.value.email || '',
            bio: user.value.bio,
            created_at: '',
            updated_at: '',
          }
        : null,
      ingredients: ingredients.filter(i => i.recipe_id === r.id),
      instructions: instructions.filter(i => i.recipe_id === r.id),
      categories: categories.filter(c => c.recipe_id === r.id),
    }))
  }

  async function getSavedRecipes(): Promise<RecipeWithDetails[]> {
    if (!user.value) throw new Error('Authentication required')

    const recipes = await sql<DbRecipe & {
      author_id: string | null
      author_name: string | null
      author_username: string | null
      author_avatar: string | null
      saved_at: string
    }>(
      `SELECT r.*, u.id as author_id, u.name as author_name, u.username as author_username, 
              u.avatar as author_avatar, f.created_at as saved_at
       FROM recipes r
       JOIN favorites f ON r.id = f.recipe_id
       LEFT JOIN users u ON r.user_id = u.id
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC`,
      [user.value.id]
    )

    if (recipes.length === 0) return []

    const recipeIds = recipes.map(r => r.id)
    const [ingredients, instructions, categories] = await Promise.all([
      sql<DbIngredient>(
        `SELECT * FROM ingredients WHERE recipe_id = ANY($1) ORDER BY sort_order`,
        [recipeIds]
      ),
      sql<DbInstruction>(
        `SELECT * FROM instructions WHERE recipe_id = ANY($1) ORDER BY step_number`,
        [recipeIds]
      ),
      sql<DbCategory & { recipe_id: number }>(
        `SELECT c.*, rc.recipe_id FROM categories c
         JOIN recipe_categories rc ON c.id = rc.category_id
         WHERE rc.recipe_id = ANY($1)`,
        [recipeIds]
      ),
    ])

    return recipes.map(r => ({
      ...r,
      author: r.author_id
        ? {
            id: r.author_id,
            name: r.author_name || '',
            username: r.author_username,
            avatar: r.author_avatar,
            email: '',
            bio: null,
            created_at: '',
            updated_at: '',
          }
        : null,
      ingredients: ingredients.filter(i => i.recipe_id === r.id),
      instructions: instructions.filter(i => i.recipe_id === r.id),
      categories: categories.filter(c => c.recipe_id === r.id),
      is_saved: true,
    }))
  }

  return {
    getPublicRecipes,
    getRecipeBySlug,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    saveRecipe,
    unsaveRecipe,
    getMyRecipes,
    getSavedRecipes,
  }
}
```

**Step 2: Commit**

```bash
git add app/services/recipeService.ts
git commit -m "feat: add recipe data service for client-side operations"
```

### Task 2.3: Create Category Data Service

**Files:**
- Create: `app/services/categoryService.ts`

**Step 1: Create category service**

```typescript
// app/services/categoryService.ts
import type { DbCategory } from '~/types/database'

export interface CategoryGroup {
  type: string
  label: string
  categories: DbCategory[]
}

const TYPE_LABELS: Record<string, string> = {
  meal: 'Meal Type',
  cuisine: 'Cuisine',
  dietary: 'Dietary',
  style: 'Cooking Style',
  dish: 'Dish Type',
  protein: 'Protein',
  occasion: 'Occasion',
  season: 'Season',
  other: 'Other',
}

export function useCategoryService() {
  const { sql } = useNeonData()

  async function getAllCategories(): Promise<DbCategory[]> {
    return sql<DbCategory>(
      `SELECT * FROM categories ORDER BY type, sort_order, name`
    )
  }

  async function getCategoriesGrouped(): Promise<CategoryGroup[]> {
    const categories = await getAllCategories()

    const grouped = new Map<string, DbCategory[]>()
    for (const cat of categories) {
      const type = cat.type || 'other'
      if (!grouped.has(type)) grouped.set(type, [])
      grouped.get(type)!.push(cat)
    }

    const typeOrder = ['meal', 'cuisine', 'dietary', 'style', 'dish', 'protein', 'occasion', 'season', 'other']
    return typeOrder
      .filter(type => grouped.has(type))
      .map(type => ({
        type,
        label: TYPE_LABELS[type] || type,
        categories: grouped.get(type)!,
      }))
  }

  return {
    getAllCategories,
    getCategoriesGrouped,
  }
}
```

**Step 2: Commit**

```bash
git add app/services/categoryService.ts
git commit -m "feat: add category data service"
```

### Task 2.4: Create Collection Data Service

**Files:**
- Create: `app/services/collectionService.ts`

**Step 1: Create collection service**

```typescript
// app/services/collectionService.ts
import type { DbCollection, DbRecipe } from '~/types/database'

export interface CollectionWithRecipes extends DbCollection {
  recipes: DbRecipe[]
  recipe_count: number
}

export interface CollectionCreateInput {
  name: string
  slug: string
  description?: string | null
  is_public?: boolean
  cover_photo?: string | null
}

export function useCollectionService() {
  const { sql } = useNeonData()
  const { user } = useAuth()

  async function getMyCollections(): Promise<CollectionWithRecipes[]> {
    if (!user.value) throw new Error('Authentication required')

    const collections = await sql<DbCollection & { recipe_count: number }>(
      `SELECT c.*, COUNT(cr.recipe_id)::int as recipe_count
       FROM collections c
       LEFT JOIN collection_recipes cr ON c.id = cr.collection_id
       WHERE c.user_id = $1
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
      [user.value.id]
    )

    return collections.map(c => ({ ...c, recipes: [] }))
  }

  async function getCollectionBySlug(
    username: string,
    slug: string
  ): Promise<CollectionWithRecipes | null> {
    const collections = await sql<DbCollection>(
      `SELECT c.* FROM collections c
       JOIN users u ON c.user_id = u.id
       WHERE u.username = $1 AND c.slug = $2`,
      [username, slug]
    )

    if (collections.length === 0) return null
    const collection = collections[0]

    const recipes = await sql<DbRecipe>(
      `SELECT r.* FROM recipes r
       JOIN collection_recipes cr ON r.id = cr.recipe_id
       WHERE cr.collection_id = $1
       ORDER BY cr.sort_order, cr.added_at DESC`,
      [collection.id]
    )

    return {
      ...collection,
      recipes,
      recipe_count: recipes.length,
    }
  }

  async function createCollection(input: CollectionCreateInput): Promise<DbCollection> {
    if (!user.value) throw new Error('Authentication required')

    const [collection] = await sql<DbCollection>(
      `INSERT INTO collections (user_id, name, slug, description, is_public, cover_photo)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        user.value.id,
        input.name,
        input.slug,
        input.description || null,
        input.is_public ?? false,
        input.cover_photo || null,
      ]
    )

    return collection
  }

  async function updateCollection(
    collectionId: number,
    input: Partial<CollectionCreateInput>
  ): Promise<DbCollection> {
    if (!user.value) throw new Error('Authentication required')

    const updates: string[] = []
    const params: unknown[] = []
    let paramIndex = 1

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex++}`)
      params.push(input.name)
    }
    if (input.slug !== undefined) {
      updates.push(`slug = $${paramIndex++}`)
      params.push(input.slug)
    }
    if (input.description !== undefined) {
      updates.push(`description = $${paramIndex++}`)
      params.push(input.description)
    }
    if (input.is_public !== undefined) {
      updates.push(`is_public = $${paramIndex++}`)
      params.push(input.is_public)
    }
    if (input.cover_photo !== undefined) {
      updates.push(`cover_photo = $${paramIndex++}`)
      params.push(input.cover_photo)
    }

    params.push(collectionId)

    const [collection] = await sql<DbCollection>(
      `UPDATE collections SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    )

    return collection
  }

  async function deleteCollection(collectionId: number): Promise<void> {
    if (!user.value) throw new Error('Authentication required')
    await sql(`DELETE FROM collections WHERE id = $1`, [collectionId])
  }

  async function addRecipeToCollection(collectionId: number, recipeId: number): Promise<void> {
    if (!user.value) throw new Error('Authentication required')

    const [maxOrder] = await sql<{ max_order: number | null }>(
      `SELECT MAX(sort_order) as max_order FROM collection_recipes WHERE collection_id = $1`,
      [collectionId]
    )

    await sql(
      `INSERT INTO collection_recipes (collection_id, recipe_id, sort_order)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [collectionId, recipeId, (maxOrder?.max_order ?? 0) + 1]
    )
  }

  async function removeRecipeFromCollection(collectionId: number, recipeId: number): Promise<void> {
    if (!user.value) throw new Error('Authentication required')
    await sql(
      `DELETE FROM collection_recipes WHERE collection_id = $1 AND recipe_id = $2`,
      [collectionId, recipeId]
    )
  }

  async function reorderCollectionRecipes(
    collectionId: number,
    recipeIds: number[]
  ): Promise<void> {
    if (!user.value) throw new Error('Authentication required')

    for (let i = 0; i < recipeIds.length; i++) {
      await sql(
        `UPDATE collection_recipes SET sort_order = $1 WHERE collection_id = $2 AND recipe_id = $3`,
        [i, collectionId, recipeIds[i]]
      )
    }
  }

  return {
    getMyCollections,
    getCollectionBySlug,
    createCollection,
    updateCollection,
    deleteCollection,
    addRecipeToCollection,
    removeRecipeFromCollection,
    reorderCollectionRecipes,
  }
}
```

**Step 2: Commit**

```bash
git add app/services/collectionService.ts
git commit -m "feat: add collection data service"
```

### Task 2.5: Create Meal Plan Data Service

**Files:**
- Create: `app/services/mealPlanService.ts`

**Step 1: Create meal plan service**

```typescript
// app/services/mealPlanService.ts
import type { DbMealPlan, DbRecipe } from '~/types/database'

export interface MealPlanWithRecipe extends DbMealPlan {
  recipe: DbRecipe | null
}

export interface MealPlanCreateInput {
  recipe_id: number
  date: string
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  servings?: number
}

export function useMealPlanService() {
  const { sql } = useNeonData()
  const { user } = useAuth()

  async function getMealPlans(startDate: string, endDate: string): Promise<MealPlanWithRecipe[]> {
    if (!user.value) throw new Error('Authentication required')

    const plans = await sql<DbMealPlan & {
      recipe_id: number
      recipe_title: string
      recipe_slug: string
      recipe_cover_photo: string | null
      recipe_prep_time: number | null
      recipe_cook_time: number | null
      recipe_servings: number | null
    }>(
      `SELECT mp.*, r.title as recipe_title, r.slug as recipe_slug, 
              r.cover_photo as recipe_cover_photo, r.prep_time as recipe_prep_time,
              r.cook_time as recipe_cook_time, r.servings as recipe_servings
       FROM meal_plans mp
       LEFT JOIN recipes r ON mp.recipe_id = r.id
       WHERE mp.user_id = $1 AND mp.date >= $2 AND mp.date <= $3
       ORDER BY mp.date, mp.meal_type`,
      [user.value.id, startDate, endDate]
    )

    return plans.map(p => ({
      ...p,
      recipe: p.recipe_title
        ? {
            id: p.recipe_id,
            title: p.recipe_title,
            slug: p.recipe_slug,
            cover_photo: p.recipe_cover_photo,
            prep_time: p.recipe_prep_time,
            cook_time: p.recipe_cook_time,
            servings: p.recipe_servings,
          } as DbRecipe
        : null,
    }))
  }

  async function createMealPlan(input: MealPlanCreateInput): Promise<DbMealPlan> {
    if (!user.value) throw new Error('Authentication required')

    const [plan] = await sql<DbMealPlan>(
      `INSERT INTO meal_plans (user_id, recipe_id, date, meal_type, servings)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [user.value.id, input.recipe_id, input.date, input.meal_type, input.servings ?? 4]
    )

    return plan
  }

  async function updateMealPlan(
    planId: number,
    input: Partial<MealPlanCreateInput>
  ): Promise<DbMealPlan> {
    if (!user.value) throw new Error('Authentication required')

    const updates: string[] = []
    const params: unknown[] = []
    let paramIndex = 1

    if (input.date !== undefined) {
      updates.push(`date = $${paramIndex++}`)
      params.push(input.date)
    }
    if (input.meal_type !== undefined) {
      updates.push(`meal_type = $${paramIndex++}`)
      params.push(input.meal_type)
    }
    if (input.servings !== undefined) {
      updates.push(`servings = $${paramIndex++}`)
      params.push(input.servings)
    }

    params.push(planId)

    const [plan] = await sql<DbMealPlan>(
      `UPDATE meal_plans SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    )

    return plan
  }

  async function deleteMealPlan(planId: number): Promise<void> {
    if (!user.value) throw new Error('Authentication required')
    await sql(`DELETE FROM meal_plans WHERE id = $1`, [planId])
  }

  return {
    getMealPlans,
    createMealPlan,
    updateMealPlan,
    deleteMealPlan,
  }
}
```

**Step 2: Commit**

```bash
git add app/services/mealPlanService.ts
git commit -m "feat: add meal plan data service"
```

### Task 2.6: Create Shopping List Data Service

**Files:**
- Create: `app/services/shoppingListService.ts`

**Step 1: Create shopping list service**

```typescript
// app/services/shoppingListService.ts
import type { DbShoppingList, DbShoppingItem } from '~/types/database'

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

export function useShoppingListService() {
  const { sql } = useNeonData()
  const { user } = useAuth()

  async function getShoppingLists(): Promise<ShoppingListWithItems[]> {
    if (!user.value) throw new Error('Authentication required')

    const lists = await sql<DbShoppingList & {
      checked_count: number
      total_count: number
    }>(
      `SELECT sl.*,
              COUNT(si.id)::int as total_count,
              COUNT(si.id) FILTER (WHERE si.checked = true)::int as checked_count
       FROM shopping_lists sl
       LEFT JOIN shopping_items si ON sl.id = si.list_id
       WHERE sl.user_id = $1
       GROUP BY sl.id
       ORDER BY sl.created_at DESC`,
      [user.value.id]
    )

    return lists.map(l => ({ ...l, items: [] }))
  }

  async function getShoppingListBySlug(slug: string): Promise<ShoppingListWithItems | null> {
    if (!user.value) throw new Error('Authentication required')

    const lists = await sql<DbShoppingList>(
      `SELECT * FROM shopping_lists WHERE user_id = $1 AND slug = $2`,
      [user.value.id, slug]
    )

    if (lists.length === 0) return null
    const list = lists[0]

    const items = await sql<DbShoppingItem>(
      `SELECT * FROM shopping_items WHERE list_id = $1 ORDER BY section, sort_order, item`,
      [list.id]
    )

    return {
      ...list,
      items,
      checked_count: items.filter(i => i.checked).length,
      total_count: items.length,
    }
  }

  async function createShoppingList(input: ShoppingListCreateInput): Promise<DbShoppingList> {
    if (!user.value) throw new Error('Authentication required')

    const [list] = await sql<DbShoppingList>(
      `INSERT INTO shopping_lists (user_id, name, slug) VALUES ($1, $2, $3) RETURNING *`,
      [user.value.id, input.name, input.slug]
    )

    return list
  }

  async function updateShoppingList(
    listId: number,
    input: Partial<ShoppingListCreateInput>
  ): Promise<DbShoppingList> {
    if (!user.value) throw new Error('Authentication required')

    const updates: string[] = []
    const params: unknown[] = []
    let paramIndex = 1

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex++}`)
      params.push(input.name)
    }
    if (input.slug !== undefined) {
      updates.push(`slug = $${paramIndex++}`)
      params.push(input.slug)
    }

    params.push(listId)

    const [list] = await sql<DbShoppingList>(
      `UPDATE shopping_lists SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    )

    return list
  }

  async function deleteShoppingList(listId: number): Promise<void> {
    if (!user.value) throw new Error('Authentication required')
    await sql(`DELETE FROM shopping_lists WHERE id = $1`, [listId])
  }

  async function addItem(listId: number, input: ShoppingItemCreateInput): Promise<DbShoppingItem> {
    if (!user.value) throw new Error('Authentication required')

    const [maxOrder] = await sql<{ max_order: number | null }>(
      `SELECT MAX(sort_order) as max_order FROM shopping_items WHERE list_id = $1`,
      [listId]
    )

    const [item] = await sql<DbShoppingItem>(
      `INSERT INTO shopping_items (list_id, item, amount, unit, section, recipe_id, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        listId,
        input.item,
        input.amount || null,
        input.unit || null,
        input.section || null,
        input.recipe_id || null,
        (maxOrder?.max_order ?? 0) + 1,
      ]
    )

    return item
  }

  async function updateItem(
    itemId: number,
    input: Partial<ShoppingItemCreateInput & { checked: boolean }>
  ): Promise<DbShoppingItem> {
    if (!user.value) throw new Error('Authentication required')

    const updates: string[] = []
    const params: unknown[] = []
    let paramIndex = 1

    if (input.item !== undefined) {
      updates.push(`item = $${paramIndex++}`)
      params.push(input.item)
    }
    if (input.amount !== undefined) {
      updates.push(`amount = $${paramIndex++}`)
      params.push(input.amount)
    }
    if (input.unit !== undefined) {
      updates.push(`unit = $${paramIndex++}`)
      params.push(input.unit)
    }
    if (input.section !== undefined) {
      updates.push(`section = $${paramIndex++}`)
      params.push(input.section)
    }
    if (input.checked !== undefined) {
      updates.push(`checked = $${paramIndex++}`)
      params.push(input.checked)
    }

    params.push(itemId)

    const [item] = await sql<DbShoppingItem>(
      `UPDATE shopping_items SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    )

    return item
  }

  async function deleteItem(itemId: number): Promise<void> {
    if (!user.value) throw new Error('Authentication required')
    await sql(`DELETE FROM shopping_items WHERE id = $1`, [itemId])
  }

  async function toggleItemChecked(itemId: number): Promise<DbShoppingItem> {
    if (!user.value) throw new Error('Authentication required')

    const [item] = await sql<DbShoppingItem>(
      `UPDATE shopping_items SET checked = NOT checked WHERE id = $1 RETURNING *`,
      [itemId]
    )

    return item
  }

  return {
    getShoppingLists,
    getShoppingListBySlug,
    createShoppingList,
    updateShoppingList,
    deleteShoppingList,
    addItem,
    updateItem,
    deleteItem,
    toggleItemChecked,
  }
}
```

**Step 2: Commit**

```bash
git add app/services/shoppingListService.ts
git commit -m "feat: add shopping list data service"
```

### Task 2.7: Create User Data Service

**Files:**
- Create: `app/services/userService.ts`

**Step 1: Create user service**

```typescript
// app/services/userService.ts
import type { DbUser, DbRecipe, DbCollection } from '~/types/database'

export interface UserProfile extends DbUser {
  recipe_count: number
  follower_count: number
  following_count: number
}

export interface UserPublicProfile {
  user: UserProfile
  recipes: DbRecipe[]
  collections: DbCollection[]
}

export function useUserService() {
  const { sql } = useNeonData()
  const { user } = useAuth()

  async function getUserProfile(userId: string): Promise<UserProfile | null> {
    const users = await sql<DbUser & {
      recipe_count: number
      follower_count: number
      following_count: number
    }>(
      `SELECT u.*,
              (SELECT COUNT(*)::int FROM recipes WHERE user_id = u.id AND is_published = true) as recipe_count,
              (SELECT COUNT(*)::int FROM follows WHERE following_id = u.id) as follower_count,
              (SELECT COUNT(*)::int FROM follows WHERE follower_id = u.id) as following_count
       FROM users u
       WHERE u.id = $1`,
      [userId]
    )

    return users.length > 0 ? users[0] : null
  }

  async function getUserByUsername(username: string): Promise<UserPublicProfile | null> {
    const users = await sql<DbUser & {
      recipe_count: number
      follower_count: number
      following_count: number
    }>(
      `SELECT u.*,
              (SELECT COUNT(*)::int FROM recipes WHERE user_id = u.id AND is_published = true) as recipe_count,
              (SELECT COUNT(*)::int FROM follows WHERE following_id = u.id) as follower_count,
              (SELECT COUNT(*)::int FROM follows WHERE follower_id = u.id) as following_count
       FROM users u
       WHERE u.username = $1`,
      [username]
    )

    if (users.length === 0) return null
    const profile = users[0]

    const [recipes, collections] = await Promise.all([
      sql<DbRecipe>(
        `SELECT * FROM recipes WHERE user_id = $1 AND is_published = true ORDER BY created_at DESC`,
        [profile.id]
      ),
      sql<DbCollection>(
        `SELECT * FROM collections WHERE user_id = $1 AND is_public = true ORDER BY created_at DESC`,
        [profile.id]
      ),
    ])

    return { user: profile, recipes, collections }
  }

  async function updateMyProfile(input: {
    name?: string
    username?: string
    bio?: string
    avatar?: string
  }): Promise<DbUser> {
    if (!user.value) throw new Error('Authentication required')

    const updates: string[] = []
    const params: unknown[] = []
    let paramIndex = 1

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex++}`)
      params.push(input.name)
    }
    if (input.username !== undefined) {
      updates.push(`username = $${paramIndex++}`)
      params.push(input.username)
    }
    if (input.bio !== undefined) {
      updates.push(`bio = $${paramIndex++}`)
      params.push(input.bio)
    }
    if (input.avatar !== undefined) {
      updates.push(`avatar = $${paramIndex++}`)
      params.push(input.avatar)
    }

    updates.push(`updated_at = NOW()`)
    params.push(user.value.id)

    const [updated] = await sql<DbUser>(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    )

    return updated
  }

  async function ensureUser(userData: { id: string; email: string; name: string }): Promise<DbUser> {
    const existing = await sql<DbUser>(
      `SELECT * FROM users WHERE id = $1`,
      [userData.id]
    )

    if (existing.length > 0) return existing[0]

    // Generate username from name
    const baseUsername = userData.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 20)

    // Check for conflicts and add number if needed
    let username = baseUsername
    let suffix = 1
    while (true) {
      const conflict = await sql<{ id: string }>(
        `SELECT id FROM users WHERE username = $1`,
        [username]
      )
      if (conflict.length === 0) break
      username = `${baseUsername}${suffix++}`
    }

    const [newUser] = await sql<DbUser>(
      `INSERT INTO users (id, email, name, username) VALUES ($1, $2, $3, $4) RETURNING *`,
      [userData.id, userData.email, userData.name, username]
    )

    return newUser
  }

  return {
    getUserProfile,
    getUserByUsername,
    updateMyProfile,
    ensureUser,
  }
}
```

**Step 2: Commit**

```bash
git add app/services/userService.ts
git commit -m "feat: add user data service"
```

### Task 2.8: Create Comment Data Service

**Files:**
- Create: `app/services/commentService.ts`

**Step 1: Create comment service**

```typescript
// app/services/commentService.ts
import type { DbComment, DbUser } from '~/types/database'

export interface CommentWithUser extends DbComment {
  user: Pick<DbUser, 'id' | 'name' | 'username' | 'avatar'>
}

export interface CommentCreateInput {
  recipe_id: number
  content: string
  photo?: string | null
  taste_rating?: number | null
  difficulty_rating?: number | null
}

export function useCommentService() {
  const { sql } = useNeonData()
  const { user } = useAuth()

  async function getRecipeComments(recipeId: number): Promise<CommentWithUser[]> {
    const comments = await sql<DbComment & {
      user_id: string
      user_name: string
      user_username: string | null
      user_avatar: string | null
    }>(
      `SELECT c.*, u.name as user_name, u.username as user_username, u.avatar as user_avatar
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.recipe_id = $1
       ORDER BY c.created_at DESC`,
      [recipeId]
    )

    return comments.map(c => ({
      ...c,
      user: {
        id: c.user_id,
        name: c.user_name,
        username: c.user_username,
        avatar: c.user_avatar,
      },
    }))
  }

  async function createComment(input: CommentCreateInput): Promise<CommentWithUser> {
    if (!user.value) throw new Error('Authentication required')

    const [comment] = await sql<DbComment>(
      `INSERT INTO comments (recipe_id, user_id, content, photo, taste_rating, difficulty_rating)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        input.recipe_id,
        user.value.id,
        input.content,
        input.photo || null,
        input.taste_rating || null,
        input.difficulty_rating || null,
      ]
    )

    // Update recipe ratings if ratings were provided
    if (input.taste_rating || input.difficulty_rating) {
      await sql(
        `UPDATE recipes SET
           avg_taste_rating = (SELECT AVG(taste_rating) FROM comments WHERE recipe_id = $1 AND taste_rating IS NOT NULL),
           avg_difficulty_rating = (SELECT AVG(difficulty_rating) FROM comments WHERE recipe_id = $1 AND difficulty_rating IS NOT NULL),
           rating_count = (SELECT COUNT(*) FROM comments WHERE recipe_id = $1 AND (taste_rating IS NOT NULL OR difficulty_rating IS NOT NULL))
         WHERE id = $1`,
        [input.recipe_id]
      )
    }

    return {
      ...comment,
      user: {
        id: user.value.id,
        name: user.value.name || '',
        username: user.value.username,
        avatar: user.value.avatar,
      },
    }
  }

  async function deleteComment(commentId: number): Promise<void> {
    if (!user.value) throw new Error('Authentication required')

    // Get recipe_id before deleting
    const [comment] = await sql<{ recipe_id: number }>(
      `SELECT recipe_id FROM comments WHERE id = $1`,
      [commentId]
    )

    await sql(`DELETE FROM comments WHERE id = $1`, [commentId])

    // Update recipe ratings
    if (comment) {
      await sql(
        `UPDATE recipes SET
           avg_taste_rating = (SELECT AVG(taste_rating) FROM comments WHERE recipe_id = $1 AND taste_rating IS NOT NULL),
           avg_difficulty_rating = (SELECT AVG(difficulty_rating) FROM comments WHERE recipe_id = $1 AND difficulty_rating IS NOT NULL),
           rating_count = (SELECT COUNT(*) FROM comments WHERE recipe_id = $1 AND (taste_rating IS NOT NULL OR difficulty_rating IS NOT NULL))
         WHERE id = $1`,
        [comment.recipe_id]
      )
    }
  }

  return {
    getRecipeComments,
    createComment,
    deleteComment,
  }
}
```

**Step 2: Commit**

```bash
git add app/services/commentService.ts
git commit -m "feat: add comment data service"
```

---

## Phase 3: Migrate Pages to Client-Side Data

### Task 3.1: Update Browse Page

**Files:**
- Modify: `app/pages/browse.vue`

**Step 1: Replace API calls with service calls**

Replace:
```typescript
const { data: categoriesData } = await useFetch<{
  groups: Array<{ type: string; label: string; categories: Array<{ id: number; name: string; slug: string }> }>
}>('/api/categories')

const { data: recipesData, status } = await useFetch<{ recipes: RecipePreview[] }>('/api/recipes', {
  query: {
    public: true,
    categories: categoryQueryParam,
  },
  headers: getAuthHeaders(),
  watch: [categoryQueryParam],
})
```

With:
```typescript
const categoryService = useCategoryService()
const recipeService = useRecipeService()

const { data: categoryGroups, pending: categoriesPending } = await useAsyncData(
  'categories',
  () => categoryService.getCategoriesGrouped()
)

const { data: recipesData, status, refresh: refreshRecipes } = await useAsyncData(
  'browse-recipes',
  () => recipeService.getPublicRecipes({
    categorySlugs: filters.value.categories.length > 0 ? filters.value.categories : undefined,
  }),
  { watch: [() => filters.value.categories] }
)
```

Replace save handlers:
```typescript
async function handleSave(recipeId: number): Promise<void> {
  if (!isRealUser.value) {
    promptSignIn()
    return
  }

  const recipe = recipesData.value?.find(r => r.id === recipeId)
  if (!recipe) return

  const wasSaved = recipe.is_saved ?? false

  // Optimistic update
  recipe.is_saved = !wasSaved
  recipe.save_count = (recipe.save_count ?? 0) + (wasSaved ? -1 : 1)

  try {
    if (wasSaved) {
      await recipeService.unsaveRecipe(recipeId)
    } else {
      await recipeService.saveRecipe(recipeId)
    }
  } catch (err) {
    // Revert on error
    recipe.is_saved = wasSaved
    recipe.save_count = (recipe.save_count ?? 0) + (wasSaved ? 1 : -1)
    console.error('Failed to toggle save:', err)
  }
}
```

**Step 2: Test browse page**

Run: `npm run dev`
Navigate to: `http://localhost:3000/browse`
Expected: Recipes load from Data API, filters work, save/unsave works

**Step 3: Commit**

```bash
git add app/pages/browse.vue
git commit -m "refactor: migrate browse page to client-side Data API"
```

### Task 3.2: Update Recipe Detail Page

**Files:**
- Modify: `app/pages/recipes/[username]/[slug]/index.vue`

**Step 1: Replace API call with service call**

Replace the useFetch call with useAsyncData and recipeService.

**Step 2: Test recipe page**

Run: `npm run dev`
Navigate to a recipe page
Expected: Recipe loads with ingredients, instructions, categories

**Step 3: Commit**

```bash
git add app/pages/recipes/[username]/[slug]/index.vue
git commit -m "refactor: migrate recipe detail page to client-side Data API"
```

### Task 3.3-3.10: Migrate Remaining Pages

Continue migrating each page:
- `app/pages/saved.vue`
- `app/pages/collections/index.vue`
- `app/pages/collections/[username]/[slug]/index.vue`
- `app/pages/meal-plan.vue`
- `app/pages/shopping/index.vue`
- `app/pages/shopping/[slug]/index.vue`
- `app/pages/users/[username].vue`
- `app/pages/recipes/new.vue`
- `app/pages/recipes/[username]/[slug]/edit.vue`

Each follows the same pattern:
1. Import the relevant service
2. Replace useFetch with useAsyncData + service method
3. Replace $fetch mutations with service methods
4. Test the page
5. Commit

---

## Phase 4: Fix Worker-Incompatible Endpoints

### Task 4.1: Replace Sharp with Client-Side Compression

**Files:**
- Create: `app/utils/imageCompression.ts`
- Modify: `app/components/ImageCropper.vue`
- Modify: `server/api/upload.post.ts`
- Modify: `server/utils/r2.ts`

**Step 1: Create client-side image compression utility**

```typescript
// app/utils/imageCompression.ts
export interface CompressedImage {
  blob: Blob
  width: number
  height: number
}

export async function compressImage(
  file: File | Blob,
  options: {
    maxWidth?: number
    maxHeight?: number
    quality?: number
    type?: 'image/webp' | 'image/jpeg'
  } = {}
): Promise<CompressedImage> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8,
    type = 'image/webp',
  } = options

  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      let { width, height } = img

      // Calculate new dimensions
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      // Create canvas and draw
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'))
            return
          }
          resolve({ blob, width, height })
        },
        type,
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}
```

**Step 2: Update upload endpoint to skip compression**

```typescript
// server/api/upload.post.ts
import { requireAuth } from '../utils/session'
import { uploadToR2 } from '../utils/r2'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const formData = await readFormData(event)
  const file = formData.get('file') as File | null
  const category = (formData.get('category') as string) || 'recipes'

  if (!file) {
    throw createError({
      statusCode: 400,
      message: 'No file provided',
    })
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF',
    })
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    throw createError({
      statusCode: 400,
      message: 'File too large. Maximum size is 10MB',
    })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const url = await uploadToR2(buffer, category, user.id, file.name, file.type)

  return { url }
})
```

**Step 3: Update R2 utility to remove sharp dependency**

```typescript
// server/utils/r2.ts
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT_URL,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const BUCKET = process.env.R2_BUCKET_NAME!

function generateKey(
  category: string,
  userId: string,
  filename: string
): string {
  const timestamp = Date.now()
  const baseName = filename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9-]/g, '_')
  const ext = filename.match(/\.[^/.]+$/)?.[0] || '.webp'
  return `${category}/${userId}/${timestamp}-${baseName}${ext}`
}

export async function uploadToR2(
  buffer: Buffer,
  category: string,
  userId: string,
  filename: string,
  contentType: string
): Promise<string> {
  const key = generateKey(category, userId, filename)

  await r2Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  )

  if (process.env.R2_CDN_URL) {
    return `${process.env.R2_CDN_URL}/${key}`
  }

  return `${process.env.R2_PUBLIC_URL}/${BUCKET}/${key}`
}

export async function deleteFromR2(urlOrKey: string): Promise<void> {
  let key = urlOrKey

  if (urlOrKey.startsWith('http')) {
    const url = new URL(urlOrKey)
    key = url.pathname.replace(`/${BUCKET}/`, '').replace(/^\//, '')
  }

  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  )
}
```

**Step 4: Update ImageCropper to compress before upload**

Add compression call before uploading in the component.

**Step 5: Remove sharp from package.json**

```bash
npm uninstall sharp
```

**Step 6: Test image upload**

Run: `npm run dev`
Upload an image via recipe editor
Expected: Image compresses client-side, uploads successfully

**Step 7: Commit**

```bash
git add -A
git commit -m "refactor: replace sharp with client-side image compression"
```

### Task 4.2: Remove Puppeteer from Recipe Import

**Files:**
- Modify: `server/api/recipes/import.post.ts`
- Delete: `server/utils/browserFetch.ts`

**Step 1: Simplify import to use fetch only**

```typescript
// server/api/recipes/import.post.ts
import { parseRecipeFromHtml, parseIngredientString } from '../../utils/recipeParser'

interface ImportBody {
  url: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<ImportBody>(event)

  if (!body.url) {
    throw createError({
      statusCode: 400,
      message: 'URL is required',
    })
  }

  let url: URL
  try {
    url = new URL(body.url)
  } catch {
    throw createError({
      statusCode: 400,
      message: 'Invalid URL',
    })
  }

  const response = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw createError({
        statusCode: 404,
        message: 'Recipe not found at this URL',
      })
    }
    throw createError({
      statusCode: 502,
      message: `Failed to fetch URL: ${response.status} ${response.statusText}`,
    })
  }

  const html = await response.text()
  const parsed = parseRecipeFromHtml(html, url.toString())

  if (!parsed) {
    throw createError({
      statusCode: 422,
      message: 'Could not find recipe data. The site may require JavaScript or have bot protection.',
    })
  }

  const structuredIngredients = parsed.ingredients.map(ing => parseIngredientString(ing))

  let prepTime = parsed.prepTime
  let cookTime = parsed.cookTime
  if (!prepTime && !cookTime && parsed.totalTime) {
    prepTime = Math.round(parsed.totalTime / 3)
    cookTime = parsed.totalTime - prepTime
  }

  return {
    recipe: {
      title: parsed.title,
      description: parsed.description,
      coverPhoto: parsed.image,
      prepTime,
      cookTime,
      servings: parsed.servings,
      sourceUrl: parsed.sourceUrl,
      sourceAuthor: parsed.sourceAuthor,
      sourceSite: parsed.sourceSite,
      ingredients: structuredIngredients,
      instructions: parsed.instructions.map(inst => ({
        content: inst.content,
        timerMinutes: inst.timerMinutes,
      })),
    },
  }
})
```

**Step 2: Delete browserFetch utility**

```bash
rm server/utils/browserFetch.ts
```

**Step 3: Remove puppeteer from package.json**

```bash
npm uninstall puppeteer
```

**Step 4: Test recipe import**

Run: `npm run dev`
Import a recipe from a simple site (not AllRecipes)
Expected: Recipe imports successfully

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove puppeteer from recipe import"
```

### Task 4.3: Move PDF Export to Client-Side

**Files:**
- Delete: `server/api/export/recipes/pdf.get.ts`
- Create: `app/utils/pdfExport.ts`
- Modify: `app/pages/recipes/[username]/[slug]/print.vue`

**Step 1: Create client-side PDF utility using jsPDF**

```bash
npm install jspdf
```

```typescript
// app/utils/pdfExport.ts
import { jsPDF } from 'jspdf'

interface RecipeData {
  title: string
  prepTime: number | null
  cookTime: number | null
  servings: number | null
  ingredients: Array<{ amount: string | null; unit: string | null; item: string }>
  instructions: Array<{ content: string }>
}

export function exportRecipeToPdf(recipe: RecipeData, format: string = 'full'): void {
  const doc = new jsPDF({
    orientation: format === '3x5' || format === '4x6' ? 'landscape' : 'portrait',
    unit: 'in',
    format: format === '3x5' ? [5, 3] : format === '4x6' ? [6, 4] : 'letter',
  })

  const margin = 0.5
  let y = margin

  // Title
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(recipe.title, margin, y)
  y += 0.3

  // Meta
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0)
  const meta = [
    totalTime ? `${totalTime} min` : null,
    recipe.servings ? `${recipe.servings} servings` : null,
  ].filter(Boolean).join(' • ')
  if (meta) {
    doc.text(meta, margin, y)
    y += 0.3
  }

  // Ingredients
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Ingredients', margin, y)
  y += 0.2

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  for (const ing of recipe.ingredients) {
    const line = `• ${ing.amount || ''} ${ing.unit || ''} ${ing.item}`.trim()
    doc.text(line, margin, y)
    y += 0.15
  }

  y += 0.2

  // Instructions
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Instructions', margin, y)
  y += 0.2

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  recipe.instructions.forEach((inst, i) => {
    const lines = doc.splitTextToSize(`${i + 1}. ${inst.content}`, 7)
    doc.text(lines, margin, y)
    y += lines.length * 0.15 + 0.05
  })

  doc.save(`${recipe.title.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`)
}
```

**Step 2: Update print page to use client-side export**

**Step 3: Delete server PDF endpoint**

```bash
rm server/api/export/recipes/pdf.get.ts
```

**Step 4: Test PDF export**

Run: `npm run dev`
Navigate to a recipe print page and click export
Expected: PDF downloads

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor: move PDF export to client-side jsPDF"
```

---

## Phase 5: Delete Unused Server Endpoints

### Task 5.1: Delete Database-Dependent Endpoints

**Files to delete:**
- `server/api/auth/*` (5 files) - using Neon Auth client-side
- `server/api/categories/index.get.ts` - using categoryService
- `server/api/collections/**/*` (10 files) - using collectionService
- `server/api/meal-plans/*` (4 files) - using mealPlanService
- `server/api/recipes/**/*` (except import.post.ts) (15 files) - using recipeService
- `server/api/saves/*` (1 file) - using recipeService
- `server/api/shopping-lists/**/*` (14 files) - using shoppingListService
- `server/api/users/**/*` (except avatar endpoints) (4 files) - using userService
- `server/api/export/recipes.get.ts` - moved to client
- `server/api/health.get.ts` - not needed for static
- `server/api/import/recipes.post.ts` - keep this one (URL scraping)

**Step 1: Delete files**

```bash
rm -rf server/api/auth
rm server/api/categories/index.get.ts
rm -rf server/api/collections
rm -rf server/api/meal-plans
rm server/api/recipes/index.get.ts server/api/recipes/index.post.ts server/api/recipes/mine.get.ts
rm -rf server/api/recipes/by-id
rm -rf server/api/recipes/[username]
rm -rf server/api/saves
rm -rf server/api/shopping-lists
rm server/api/users/[id]/profile.get.ts
rm -rf server/api/users/by-username
rm server/api/users/ensure.post.ts server/api/users/me.put.ts
rm server/api/export/recipes.get.ts
rm server/api/health.get.ts
```

**Step 2: Delete unused server utilities**

```bash
rm server/utils/session.ts
rm server/utils/slug.ts
rm server/utils/ingredientConsolidator.ts
```

**Step 3: Remove drizzle-orm from server (keep for migrations)**

Keep the db folder for migrations but remove runtime usage.

**Step 4: Verify remaining endpoints**

```bash
find server/api -name "*.ts" -type f
```

Expected:
- `server/api/upload.post.ts`
- `server/api/users/me/avatar.post.ts`
- `server/api/users/me/avatar.delete.ts`
- `server/api/recipes/import.post.ts`

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: delete server endpoints migrated to client-side Data API"
```

---

## Phase 6: Configure Nuxt for Cloudflare Pages

### Task 6.1: Update Nuxt Config

**Files:**
- Modify: `nuxt.config.ts`

**Step 1: Add cloudflare-pages preset**

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  // ... existing config ...

  nitro: {
    preset: 'cloudflare-pages',
  },

  // For static generation of public pages
  routeRules: {
    '/': { prerender: true },
    '/browse': { prerender: true },
    '/auth/**': { prerender: true },
  },
})
```

**Step 2: Commit**

```bash
git add nuxt.config.ts
git commit -m "feat: configure Nuxt for Cloudflare Pages deployment"
```

### Task 6.2: Create Cloudflare Configuration

**Files:**
- Create: `wrangler.toml`

**Step 1: Create wrangler config**

```toml
# wrangler.toml
name = "twoteaspoons"
compatibility_date = "2024-01-01"

[vars]
# Non-sensitive env vars can go here

[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "twoteaspoons-images"
```

**Step 2: Commit**

```bash
git add wrangler.toml
git commit -m "feat: add Cloudflare wrangler configuration"
```

### Task 6.3: Update Environment Variables Documentation

**Files:**
- Create: `.env.example`

**Step 1: Document required env vars**

```bash
# .env.example

# Neon Data API (public, used client-side)
NUXT_PUBLIC_NEON_AUTH_URL=https://your-project.auth.neon.tech
NUXT_PUBLIC_NEON_DATA_API_URL=https://your-project.data.neon.tech

# R2 Storage (server-side only, for upload endpoint)
R2_ENDPOINT_URL=https://your-account.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=twoteaspoons-images
R2_CDN_URL=https://images.twotsps.com
```

**Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: add environment variables example"
```

---

## Phase 7: Testing & Deployment

### Task 7.1: Run Full Test Suite

**Step 1: Run type check**

```bash
npm run typecheck
```

Expected: No errors

**Step 2: Run linter**

```bash
npm run lint
```

Expected: No errors (or only warnings)

**Step 3: Run unit tests**

```bash
npm run test:unit
```

Expected: All tests pass (some may need updating for new service pattern)

**Step 4: Run E2E tests**

```bash
npm run test:e2e
```

Expected: All tests pass

**Step 5: Commit any test fixes**

```bash
git add -A
git commit -m "test: fix tests for client-side Data API migration"
```

### Task 7.2: Manual Testing Checklist

Test each feature manually:

- [ ] Browse recipes (unauthenticated)
- [ ] Sign up new user
- [ ] Sign in existing user
- [ ] Create recipe
- [ ] Edit recipe
- [ ] Delete recipe
- [ ] Save/unsave recipe
- [ ] View recipe detail
- [ ] Fork recipe
- [ ] Import recipe from URL
- [ ] Upload recipe image
- [ ] Create collection
- [ ] Add recipe to collection
- [ ] View collection
- [ ] Delete collection
- [ ] View meal plan
- [ ] Add to meal plan
- [ ] Remove from meal plan
- [ ] Create shopping list
- [ ] Add items to shopping list
- [ ] Check/uncheck items
- [ ] View user profile
- [ ] Update user profile
- [ ] Upload avatar
- [ ] Sign out

### Task 7.3: Build for Production

**Step 1: Build**

```bash
npm run build
```

Expected: Build completes without errors

**Step 2: Preview locally**

```bash
npm run preview
```

Test the production build locally.

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: verify production build"
```

### Task 7.4: Apply RLS Policies to Database

**Step 1: Connect to Neon and run migration**

```bash
# Using Neon CLI or psql
psql $DATABASE_URL < server/db/migrations/0001_add_rls_policies.sql
```

**Step 2: Verify RLS is enabled**

```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
```

Expected: All tables show `rowsecurity = true`

### Task 7.5: Deploy to Cloudflare Pages

**Step 1: Connect GitHub repo to Cloudflare Pages**

1. Go to Cloudflare Dashboard → Pages
2. Create new project
3. Connect GitHub repo
4. Configure build:
   - Build command: `npm run build`
   - Build output directory: `.output/public`
   - Root directory: `/`

**Step 2: Add environment variables in Cloudflare**

Add all variables from `.env.example`

**Step 3: Deploy**

Push to main branch or trigger manual deploy.

**Step 4: Verify deployment**

Visit the deployed URL and test all features.

---

## Summary

**Endpoints Remaining (4):**
1. `POST /api/upload` - Image upload to R2
2. `POST /api/users/me/avatar` - Avatar upload
3. `DELETE /api/users/me/avatar` - Avatar delete
4. `POST /api/recipes/import` - URL scraping

**Endpoints Migrated to Client-Side (64):**
All database CRUD operations now use Neon Data API directly from the browser, secured by RLS.

**Dependencies Removed:**
- `sharp` - replaced with client-side canvas compression
- `puppeteer` - removed headless browser fallback
- `ws` - no longer needed for server-side Neon connection

**New Client-Side Services:**
- `useNeonData()` - core SQL execution
- `useRecipeService()` - recipe CRUD
- `useCategoryService()` - category queries
- `useCollectionService()` - collection CRUD
- `useMealPlanService()` - meal plan CRUD
- `useShoppingListService()` - shopping list CRUD
- `useUserService()` - user profile operations
- `useCommentService()` - comment CRUD
