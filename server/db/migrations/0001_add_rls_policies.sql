-- Row-Level Security Policies for TwoTeaspoons
-- This migration adds RLS policies for data access control at the database level.
--
-- IMPORTANT: This migration is designed for Neon Auth + Neon Data API.
-- Neon Auth automatically sets the `auth.user_id` session variable based on the
-- authenticated user's JWT token. For anonymous/public requests, auth.user_id is NULL.
--
-- To apply: Run this SQL directly against your Neon database.
-- To rollback: See the DROP POLICY statements at the bottom.

-- ============================================
-- USERS TABLE
-- Anyone can read user profiles, only self can update
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read user profiles (public)
CREATE POLICY users_select_policy ON users
    FOR SELECT
    USING (true);

-- Policy: Users can only insert their own profile (matching their auth ID)
CREATE POLICY users_insert_policy ON users
    FOR INSERT
    WITH CHECK (
        id = current_setting('auth.user_id', true)
        AND current_setting('auth.user_id', true) IS NOT NULL
        AND current_setting('auth.user_id', true) != ''
    );

-- Policy: Users can only update their own profile
CREATE POLICY users_update_policy ON users
    FOR UPDATE
    USING (id = current_setting('auth.user_id', true))
    WITH CHECK (id = current_setting('auth.user_id', true));

-- Policy: Users can only delete their own profile
CREATE POLICY users_delete_policy ON users
    FOR DELETE
    USING (id = current_setting('auth.user_id', true));

-- ============================================
-- RECIPES TABLE
-- ============================================

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own recipes OR published recipes
CREATE POLICY recipes_select_policy ON recipes
    FOR SELECT
    USING (
        user_id = current_setting('auth.user_id', true)
        OR is_published = true
    );

-- Policy: Users can only insert their own recipes
CREATE POLICY recipes_insert_policy ON recipes
    FOR INSERT
    WITH CHECK (
        user_id = current_setting('auth.user_id', true)
        AND current_setting('auth.user_id', true) IS NOT NULL
        AND current_setting('auth.user_id', true) != ''
    );

-- Policy: Users can only update their own recipes
CREATE POLICY recipes_update_policy ON recipes
    FOR UPDATE
    USING (user_id = current_setting('auth.user_id', true))
    WITH CHECK (user_id = current_setting('auth.user_id', true));

-- Policy: Users can only delete their own recipes
CREATE POLICY recipes_delete_policy ON recipes
    FOR DELETE
    USING (user_id = current_setting('auth.user_id', true));

-- ============================================
-- INGREDIENTS TABLE
-- Follow parent recipe's visibility
-- ============================================

ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view ingredients for recipes they can see
CREATE POLICY ingredients_select_policy ON ingredients
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = ingredients.recipe_id
            AND (recipes.user_id = current_setting('auth.user_id', true) OR recipes.is_published = true)
        )
    );

-- Policy: Users can only insert ingredients for their own recipes
CREATE POLICY ingredients_insert_policy ON ingredients
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = recipe_id
            AND recipes.user_id = current_setting('auth.user_id', true)
        )
    );

-- Policy: Users can only update ingredients for their own recipes
CREATE POLICY ingredients_update_policy ON ingredients
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = ingredients.recipe_id
            AND recipes.user_id = current_setting('auth.user_id', true)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = recipe_id
            AND recipes.user_id = current_setting('auth.user_id', true)
        )
    );

-- Policy: Users can only delete ingredients for their own recipes
CREATE POLICY ingredients_delete_policy ON ingredients
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = ingredients.recipe_id
            AND recipes.user_id = current_setting('auth.user_id', true)
        )
    );

-- ============================================
-- INSTRUCTIONS TABLE
-- Follow parent recipe's visibility
-- ============================================

ALTER TABLE instructions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view instructions for recipes they can see
CREATE POLICY instructions_select_policy ON instructions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = instructions.recipe_id
            AND (recipes.user_id = current_setting('auth.user_id', true) OR recipes.is_published = true)
        )
    );

-- Policy: Users can only insert instructions for their own recipes
CREATE POLICY instructions_insert_policy ON instructions
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = recipe_id
            AND recipes.user_id = current_setting('auth.user_id', true)
        )
    );

-- Policy: Users can only update instructions for their own recipes
CREATE POLICY instructions_update_policy ON instructions
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = instructions.recipe_id
            AND recipes.user_id = current_setting('auth.user_id', true)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = recipe_id
            AND recipes.user_id = current_setting('auth.user_id', true)
        )
    );

-- Policy: Users can only delete instructions for their own recipes
CREATE POLICY instructions_delete_policy ON instructions
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = instructions.recipe_id
            AND recipes.user_id = current_setting('auth.user_id', true)
        )
    );

-- ============================================
-- RECIPE SLUG HISTORY TABLE
-- Follow parent recipe's visibility
-- ============================================

ALTER TABLE recipe_slug_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view slug history for recipes they can see
CREATE POLICY recipe_slug_history_select_policy ON recipe_slug_history
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = recipe_slug_history.recipe_id
            AND (recipes.user_id = current_setting('auth.user_id', true) OR recipes.is_published = true)
        )
    );

-- Policy: Users can only insert slug history for their own recipes
CREATE POLICY recipe_slug_history_insert_policy ON recipe_slug_history
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = recipe_id
            AND recipes.user_id = current_setting('auth.user_id', true)
        )
    );

-- Policy: Users can only delete slug history for their own recipes
CREATE POLICY recipe_slug_history_delete_policy ON recipe_slug_history
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = recipe_slug_history.recipe_id
            AND recipes.user_id = current_setting('auth.user_id', true)
        )
    );

-- ============================================
-- CATEGORIES TABLE
-- Public read-only (system-managed)
-- ============================================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read categories
CREATE POLICY categories_select_policy ON categories
    FOR SELECT
    USING (true);

-- No insert/update/delete policies - categories are managed by admins/system only

-- ============================================
-- RECIPE_CATEGORIES TABLE
-- Follow parent recipe's visibility
-- ============================================

ALTER TABLE recipe_categories ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view recipe categories for recipes they can see
CREATE POLICY recipe_categories_select_policy ON recipe_categories
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = recipe_categories.recipe_id
            AND (recipes.user_id = current_setting('auth.user_id', true) OR recipes.is_published = true)
        )
    );

-- Policy: Users can only insert recipe categories for their own recipes
CREATE POLICY recipe_categories_insert_policy ON recipe_categories
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = recipe_id
            AND recipes.user_id = current_setting('auth.user_id', true)
        )
    );

-- Policy: Users can only delete recipe categories for their own recipes
CREATE POLICY recipe_categories_delete_policy ON recipe_categories
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = recipe_categories.recipe_id
            AND recipes.user_id = current_setting('auth.user_id', true)
        )
    );

-- ============================================
-- TAGS TABLE
-- User-owned only
-- ============================================

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own tags
CREATE POLICY tags_select_policy ON tags
    FOR SELECT
    USING (user_id = current_setting('auth.user_id', true));

-- Policy: Users can only insert their own tags
CREATE POLICY tags_insert_policy ON tags
    FOR INSERT
    WITH CHECK (
        user_id = current_setting('auth.user_id', true)
        AND current_setting('auth.user_id', true) IS NOT NULL
        AND current_setting('auth.user_id', true) != ''
    );

-- Policy: Users can only update their own tags
CREATE POLICY tags_update_policy ON tags
    FOR UPDATE
    USING (user_id = current_setting('auth.user_id', true))
    WITH CHECK (user_id = current_setting('auth.user_id', true));

-- Policy: Users can only delete their own tags
CREATE POLICY tags_delete_policy ON tags
    FOR DELETE
    USING (user_id = current_setting('auth.user_id', true));

-- ============================================
-- RECIPE_TAGS TABLE
-- Follow parent recipe and tag ownership
-- ============================================

ALTER TABLE recipe_tags ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view recipe tags for their own recipes
-- (Tags are personal, so only owner can see the tag associations)
CREATE POLICY recipe_tags_select_policy ON recipe_tags
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = recipe_tags.recipe_id
            AND recipes.user_id = current_setting('auth.user_id', true)
        )
    );

-- Policy: Users can only insert recipe tags for their own recipes with their own tags
CREATE POLICY recipe_tags_insert_policy ON recipe_tags
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = recipe_id
            AND recipes.user_id = current_setting('auth.user_id', true)
        )
        AND EXISTS (
            SELECT 1 FROM tags
            WHERE tags.id = tag_id
            AND tags.user_id = current_setting('auth.user_id', true)
        )
    );

-- Policy: Users can only delete recipe tags for their own recipes
CREATE POLICY recipe_tags_delete_policy ON recipe_tags
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = recipe_tags.recipe_id
            AND recipes.user_id = current_setting('auth.user_id', true)
        )
    );

-- ============================================
-- COLLECTIONS TABLE
-- ============================================

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own collections OR public collections
CREATE POLICY collections_select_policy ON collections
    FOR SELECT
    USING (
        user_id = current_setting('auth.user_id', true)
        OR is_public = true
    );

-- Policy: Users can only insert their own collections
CREATE POLICY collections_insert_policy ON collections
    FOR INSERT
    WITH CHECK (
        user_id = current_setting('auth.user_id', true)
        AND current_setting('auth.user_id', true) IS NOT NULL
        AND current_setting('auth.user_id', true) != ''
    );

-- Policy: Users can only update their own collections
CREATE POLICY collections_update_policy ON collections
    FOR UPDATE
    USING (user_id = current_setting('auth.user_id', true))
    WITH CHECK (user_id = current_setting('auth.user_id', true));

-- Policy: Users can only delete their own collections
CREATE POLICY collections_delete_policy ON collections
    FOR DELETE
    USING (user_id = current_setting('auth.user_id', true));

-- ============================================
-- COLLECTION_RECIPES TABLE
-- Follow parent collection's visibility
-- ============================================

ALTER TABLE collection_recipes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view collection recipes for collections they can see
CREATE POLICY collection_recipes_select_policy ON collection_recipes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM collections
            WHERE collections.id = collection_recipes.collection_id
            AND (collections.user_id = current_setting('auth.user_id', true) OR collections.is_public = true)
        )
    );

-- Policy: Users can only insert collection recipes for their own collections
CREATE POLICY collection_recipes_insert_policy ON collection_recipes
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM collections
            WHERE collections.id = collection_id
            AND collections.user_id = current_setting('auth.user_id', true)
        )
    );

-- Policy: Users can only update collection recipes for their own collections
CREATE POLICY collection_recipes_update_policy ON collection_recipes
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM collections
            WHERE collections.id = collection_recipes.collection_id
            AND collections.user_id = current_setting('auth.user_id', true)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM collections
            WHERE collections.id = collection_id
            AND collections.user_id = current_setting('auth.user_id', true)
        )
    );

-- Policy: Users can only delete collection recipes for their own collections
CREATE POLICY collection_recipes_delete_policy ON collection_recipes
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM collections
            WHERE collections.id = collection_recipes.collection_id
            AND collections.user_id = current_setting('auth.user_id', true)
        )
    );

-- ============================================
-- FOLLOWS TABLE
-- Public read, own user actions
-- ============================================

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can see follows (public social graph)
CREATE POLICY follows_select_policy ON follows
    FOR SELECT
    USING (true);

-- Policy: Users can only insert follows where they are the follower
CREATE POLICY follows_insert_policy ON follows
    FOR INSERT
    WITH CHECK (
        follower_id = current_setting('auth.user_id', true)
        AND current_setting('auth.user_id', true) IS NOT NULL
        AND current_setting('auth.user_id', true) != ''
    );

-- Policy: Users can only delete follows where they are the follower
CREATE POLICY follows_delete_policy ON follows
    FOR DELETE
    USING (follower_id = current_setting('auth.user_id', true));

-- ============================================
-- FAVORITES TABLE
-- ============================================

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own favorites
CREATE POLICY favorites_select_policy ON favorites
    FOR SELECT
    USING (user_id = current_setting('auth.user_id', true));

-- Policy: Users can only insert their own favorites
CREATE POLICY favorites_insert_policy ON favorites
    FOR INSERT
    WITH CHECK (
        user_id = current_setting('auth.user_id', true)
        AND current_setting('auth.user_id', true) IS NOT NULL
        AND current_setting('auth.user_id', true) != ''
    );

-- Policy: Users can only delete their own favorites
CREATE POLICY favorites_delete_policy ON favorites
    FOR DELETE
    USING (user_id = current_setting('auth.user_id', true));

-- ============================================
-- COMMENTS TABLE
-- Public read (on visible recipes), own user write
-- ============================================

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view comments on recipes they can see
CREATE POLICY comments_select_policy ON comments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = comments.recipe_id
            AND (recipes.user_id = current_setting('auth.user_id', true) OR recipes.is_published = true)
        )
    );

-- Policy: Users can only insert comments as themselves on visible recipes
CREATE POLICY comments_insert_policy ON comments
    FOR INSERT
    WITH CHECK (
        user_id = current_setting('auth.user_id', true)
        AND current_setting('auth.user_id', true) IS NOT NULL
        AND current_setting('auth.user_id', true) != ''
        AND EXISTS (
            SELECT 1 FROM recipes
            WHERE recipes.id = recipe_id
            AND (recipes.user_id = current_setting('auth.user_id', true) OR recipes.is_published = true)
        )
    );

-- Policy: Users can only update their own comments
CREATE POLICY comments_update_policy ON comments
    FOR UPDATE
    USING (user_id = current_setting('auth.user_id', true))
    WITH CHECK (user_id = current_setting('auth.user_id', true));

-- Policy: Users can only delete their own comments
CREATE POLICY comments_delete_policy ON comments
    FOR DELETE
    USING (user_id = current_setting('auth.user_id', true));

-- ============================================
-- MEAL_PLANS TABLE
-- ============================================

ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own meal plans
CREATE POLICY meal_plans_select_policy ON meal_plans
    FOR SELECT
    USING (user_id = current_setting('auth.user_id', true));

-- Policy: Users can only insert their own meal plans
CREATE POLICY meal_plans_insert_policy ON meal_plans
    FOR INSERT
    WITH CHECK (
        user_id = current_setting('auth.user_id', true)
        AND current_setting('auth.user_id', true) IS NOT NULL
        AND current_setting('auth.user_id', true) != ''
    );

-- Policy: Users can only update their own meal plans
CREATE POLICY meal_plans_update_policy ON meal_plans
    FOR UPDATE
    USING (user_id = current_setting('auth.user_id', true))
    WITH CHECK (user_id = current_setting('auth.user_id', true));

-- Policy: Users can only delete their own meal plans
CREATE POLICY meal_plans_delete_policy ON meal_plans
    FOR DELETE
    USING (user_id = current_setting('auth.user_id', true));

-- ============================================
-- SHOPPING_LISTS TABLE
-- ============================================

ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own shopping lists
CREATE POLICY shopping_lists_select_policy ON shopping_lists
    FOR SELECT
    USING (user_id = current_setting('auth.user_id', true));

-- Policy: Users can only insert their own shopping lists
CREATE POLICY shopping_lists_insert_policy ON shopping_lists
    FOR INSERT
    WITH CHECK (
        user_id = current_setting('auth.user_id', true)
        AND current_setting('auth.user_id', true) IS NOT NULL
        AND current_setting('auth.user_id', true) != ''
    );

-- Policy: Users can only update their own shopping lists
CREATE POLICY shopping_lists_update_policy ON shopping_lists
    FOR UPDATE
    USING (user_id = current_setting('auth.user_id', true))
    WITH CHECK (user_id = current_setting('auth.user_id', true));

-- Policy: Users can only delete their own shopping lists
CREATE POLICY shopping_lists_delete_policy ON shopping_lists
    FOR DELETE
    USING (user_id = current_setting('auth.user_id', true));

-- ============================================
-- SHOPPING_ITEMS TABLE
-- Follow parent shopping_list ownership
-- ============================================

ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view shopping items for their own lists
CREATE POLICY shopping_items_select_policy ON shopping_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM shopping_lists
            WHERE shopping_lists.id = shopping_items.list_id
            AND shopping_lists.user_id = current_setting('auth.user_id', true)
        )
    );

-- Policy: Users can only insert shopping items for their own lists
CREATE POLICY shopping_items_insert_policy ON shopping_items
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM shopping_lists
            WHERE shopping_lists.id = list_id
            AND shopping_lists.user_id = current_setting('auth.user_id', true)
        )
    );

-- Policy: Users can only update shopping items for their own lists
CREATE POLICY shopping_items_update_policy ON shopping_items
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM shopping_lists
            WHERE shopping_lists.id = shopping_items.list_id
            AND shopping_lists.user_id = current_setting('auth.user_id', true)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM shopping_lists
            WHERE shopping_lists.id = list_id
            AND shopping_lists.user_id = current_setting('auth.user_id', true)
        )
    );

-- Policy: Users can only delete shopping items for their own lists
CREATE POLICY shopping_items_delete_policy ON shopping_items
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM shopping_lists
            WHERE shopping_lists.id = shopping_items.list_id
            AND shopping_lists.user_id = current_setting('auth.user_id', true)
        )
    );

-- ============================================
-- ROLLBACK STATEMENTS (run these to remove RLS)
-- ============================================
--
-- -- Users
-- DROP POLICY IF EXISTS users_select_policy ON users;
-- DROP POLICY IF EXISTS users_insert_policy ON users;
-- DROP POLICY IF EXISTS users_update_policy ON users;
-- DROP POLICY IF EXISTS users_delete_policy ON users;
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;
--
-- -- Recipes
-- DROP POLICY IF EXISTS recipes_select_policy ON recipes;
-- DROP POLICY IF EXISTS recipes_insert_policy ON recipes;
-- DROP POLICY IF EXISTS recipes_update_policy ON recipes;
-- DROP POLICY IF EXISTS recipes_delete_policy ON recipes;
-- ALTER TABLE recipes DISABLE ROW LEVEL SECURITY;
--
-- -- Ingredients
-- DROP POLICY IF EXISTS ingredients_select_policy ON ingredients;
-- DROP POLICY IF EXISTS ingredients_insert_policy ON ingredients;
-- DROP POLICY IF EXISTS ingredients_update_policy ON ingredients;
-- DROP POLICY IF EXISTS ingredients_delete_policy ON ingredients;
-- ALTER TABLE ingredients DISABLE ROW LEVEL SECURITY;
--
-- -- Instructions
-- DROP POLICY IF EXISTS instructions_select_policy ON instructions;
-- DROP POLICY IF EXISTS instructions_insert_policy ON instructions;
-- DROP POLICY IF EXISTS instructions_update_policy ON instructions;
-- DROP POLICY IF EXISTS instructions_delete_policy ON instructions;
-- ALTER TABLE instructions DISABLE ROW LEVEL SECURITY;
--
-- -- Recipe Slug History
-- DROP POLICY IF EXISTS recipe_slug_history_select_policy ON recipe_slug_history;
-- DROP POLICY IF EXISTS recipe_slug_history_insert_policy ON recipe_slug_history;
-- DROP POLICY IF EXISTS recipe_slug_history_delete_policy ON recipe_slug_history;
-- ALTER TABLE recipe_slug_history DISABLE ROW LEVEL SECURITY;
--
-- -- Categories
-- DROP POLICY IF EXISTS categories_select_policy ON categories;
-- ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
--
-- -- Recipe Categories
-- DROP POLICY IF EXISTS recipe_categories_select_policy ON recipe_categories;
-- DROP POLICY IF EXISTS recipe_categories_insert_policy ON recipe_categories;
-- DROP POLICY IF EXISTS recipe_categories_delete_policy ON recipe_categories;
-- ALTER TABLE recipe_categories DISABLE ROW LEVEL SECURITY;
--
-- -- Tags
-- DROP POLICY IF EXISTS tags_select_policy ON tags;
-- DROP POLICY IF EXISTS tags_insert_policy ON tags;
-- DROP POLICY IF EXISTS tags_update_policy ON tags;
-- DROP POLICY IF EXISTS tags_delete_policy ON tags;
-- ALTER TABLE tags DISABLE ROW LEVEL SECURITY;
--
-- -- Recipe Tags
-- DROP POLICY IF EXISTS recipe_tags_select_policy ON recipe_tags;
-- DROP POLICY IF EXISTS recipe_tags_insert_policy ON recipe_tags;
-- DROP POLICY IF EXISTS recipe_tags_delete_policy ON recipe_tags;
-- ALTER TABLE recipe_tags DISABLE ROW LEVEL SECURITY;
--
-- -- Collections
-- DROP POLICY IF EXISTS collections_select_policy ON collections;
-- DROP POLICY IF EXISTS collections_insert_policy ON collections;
-- DROP POLICY IF EXISTS collections_update_policy ON collections;
-- DROP POLICY IF EXISTS collections_delete_policy ON collections;
-- ALTER TABLE collections DISABLE ROW LEVEL SECURITY;
--
-- -- Collection Recipes
-- DROP POLICY IF EXISTS collection_recipes_select_policy ON collection_recipes;
-- DROP POLICY IF EXISTS collection_recipes_insert_policy ON collection_recipes;
-- DROP POLICY IF EXISTS collection_recipes_update_policy ON collection_recipes;
-- DROP POLICY IF EXISTS collection_recipes_delete_policy ON collection_recipes;
-- ALTER TABLE collection_recipes DISABLE ROW LEVEL SECURITY;
--
-- -- Follows
-- DROP POLICY IF EXISTS follows_select_policy ON follows;
-- DROP POLICY IF EXISTS follows_insert_policy ON follows;
-- DROP POLICY IF EXISTS follows_delete_policy ON follows;
-- ALTER TABLE follows DISABLE ROW LEVEL SECURITY;
--
-- -- Favorites
-- DROP POLICY IF EXISTS favorites_select_policy ON favorites;
-- DROP POLICY IF EXISTS favorites_insert_policy ON favorites;
-- DROP POLICY IF EXISTS favorites_delete_policy ON favorites;
-- ALTER TABLE favorites DISABLE ROW LEVEL SECURITY;
--
-- -- Comments
-- DROP POLICY IF EXISTS comments_select_policy ON comments;
-- DROP POLICY IF EXISTS comments_insert_policy ON comments;
-- DROP POLICY IF EXISTS comments_update_policy ON comments;
-- DROP POLICY IF EXISTS comments_delete_policy ON comments;
-- ALTER TABLE comments DISABLE ROW LEVEL SECURITY;
--
-- -- Meal Plans
-- DROP POLICY IF EXISTS meal_plans_select_policy ON meal_plans;
-- DROP POLICY IF EXISTS meal_plans_insert_policy ON meal_plans;
-- DROP POLICY IF EXISTS meal_plans_update_policy ON meal_plans;
-- DROP POLICY IF EXISTS meal_plans_delete_policy ON meal_plans;
-- ALTER TABLE meal_plans DISABLE ROW LEVEL SECURITY;
--
-- -- Shopping Lists
-- DROP POLICY IF EXISTS shopping_lists_select_policy ON shopping_lists;
-- DROP POLICY IF EXISTS shopping_lists_insert_policy ON shopping_lists;
-- DROP POLICY IF EXISTS shopping_lists_update_policy ON shopping_lists;
-- DROP POLICY IF EXISTS shopping_lists_delete_policy ON shopping_lists;
-- ALTER TABLE shopping_lists DISABLE ROW LEVEL SECURITY;
--
-- -- Shopping Items
-- DROP POLICY IF EXISTS shopping_items_select_policy ON shopping_items;
-- DROP POLICY IF EXISTS shopping_items_insert_policy ON shopping_items;
-- DROP POLICY IF EXISTS shopping_items_update_policy ON shopping_items;
-- DROP POLICY IF EXISTS shopping_items_delete_policy ON shopping_items;
-- ALTER TABLE shopping_items DISABLE ROW LEVEL SECURITY;
