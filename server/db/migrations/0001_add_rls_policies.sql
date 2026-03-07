-- Row-Level Security Policies for TwoTeaspoons
-- This migration adds RLS policies for data access control at the database level.
--
-- IMPORTANT: Before running this migration, ensure:
-- 1. Your application sets the user context before each query using:
--    SET LOCAL app.user_id = 'user-uuid-here';
-- 2. For anonymous/public requests, set app.user_id to empty string: SET LOCAL app.user_id = '';
--
-- To apply: Run this SQL directly against your Neon database.
-- To rollback: See the DROP POLICY statements at the bottom.

-- Enable RLS on collections table
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own collections OR public collections
CREATE POLICY collections_select_policy ON collections
    FOR SELECT
    USING (
        user_id = current_setting('app.user_id', true)
        OR is_public = true
    );

-- Policy: Users can only insert their own collections
CREATE POLICY collections_insert_policy ON collections
    FOR INSERT
    WITH CHECK (
        user_id = current_setting('app.user_id', true)
        AND current_setting('app.user_id', true) != ''
    );

-- Policy: Users can only update their own collections
CREATE POLICY collections_update_policy ON collections
    FOR UPDATE
    USING (user_id = current_setting('app.user_id', true))
    WITH CHECK (user_id = current_setting('app.user_id', true));

-- Policy: Users can only delete their own collections
CREATE POLICY collections_delete_policy ON collections
    FOR DELETE
    USING (user_id = current_setting('app.user_id', true));

-- Enable RLS on recipes table
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own recipes OR published recipes
CREATE POLICY recipes_select_policy ON recipes
    FOR SELECT
    USING (
        user_id = current_setting('app.user_id', true)
        OR is_published = true
    );

-- Policy: Users can only insert their own recipes
CREATE POLICY recipes_insert_policy ON recipes
    FOR INSERT
    WITH CHECK (
        user_id = current_setting('app.user_id', true)
        AND current_setting('app.user_id', true) != ''
    );

-- Policy: Users can only update their own recipes
CREATE POLICY recipes_update_policy ON recipes
    FOR UPDATE
    USING (user_id = current_setting('app.user_id', true))
    WITH CHECK (user_id = current_setting('app.user_id', true));

-- Policy: Users can only delete their own recipes
CREATE POLICY recipes_delete_policy ON recipes
    FOR DELETE
    USING (user_id = current_setting('app.user_id', true));

-- Enable RLS on favorites (saves) table
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own favorites
CREATE POLICY favorites_select_policy ON favorites
    FOR SELECT
    USING (user_id = current_setting('app.user_id', true));

-- Policy: Users can only insert their own favorites
CREATE POLICY favorites_insert_policy ON favorites
    FOR INSERT
    WITH CHECK (
        user_id = current_setting('app.user_id', true)
        AND current_setting('app.user_id', true) != ''
    );

-- Policy: Users can only delete their own favorites
CREATE POLICY favorites_delete_policy ON favorites
    FOR DELETE
    USING (user_id = current_setting('app.user_id', true));

-- Enable RLS on meal_plans table
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own meal plans
CREATE POLICY meal_plans_select_policy ON meal_plans
    FOR SELECT
    USING (user_id = current_setting('app.user_id', true));

-- Policy: Users can only insert their own meal plans
CREATE POLICY meal_plans_insert_policy ON meal_plans
    FOR INSERT
    WITH CHECK (
        user_id = current_setting('app.user_id', true)
        AND current_setting('app.user_id', true) != ''
    );

-- Policy: Users can only update their own meal plans
CREATE POLICY meal_plans_update_policy ON meal_plans
    FOR UPDATE
    USING (user_id = current_setting('app.user_id', true))
    WITH CHECK (user_id = current_setting('app.user_id', true));

-- Policy: Users can only delete their own meal plans
CREATE POLICY meal_plans_delete_policy ON meal_plans
    FOR DELETE
    USING (user_id = current_setting('app.user_id', true));

-- Enable RLS on shopping_lists table
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own shopping lists
CREATE POLICY shopping_lists_select_policy ON shopping_lists
    FOR SELECT
    USING (user_id = current_setting('app.user_id', true));

-- Policy: Users can only insert their own shopping lists
CREATE POLICY shopping_lists_insert_policy ON shopping_lists
    FOR INSERT
    WITH CHECK (
        user_id = current_setting('app.user_id', true)
        AND current_setting('app.user_id', true) != ''
    );

-- Policy: Users can only update their own shopping lists
CREATE POLICY shopping_lists_update_policy ON shopping_lists
    FOR UPDATE
    USING (user_id = current_setting('app.user_id', true))
    WITH CHECK (user_id = current_setting('app.user_id', true));

-- Policy: Users can only delete their own shopping lists
CREATE POLICY shopping_lists_delete_policy ON shopping_lists
    FOR DELETE
    USING (user_id = current_setting('app.user_id', true));

-- ============================================
-- ROLLBACK STATEMENTS (run these to remove RLS)
-- ============================================
--
-- DROP POLICY IF EXISTS collections_select_policy ON collections;
-- DROP POLICY IF EXISTS collections_insert_policy ON collections;
-- DROP POLICY IF EXISTS collections_update_policy ON collections;
-- DROP POLICY IF EXISTS collections_delete_policy ON collections;
-- ALTER TABLE collections DISABLE ROW LEVEL SECURITY;
--
-- DROP POLICY IF EXISTS recipes_select_policy ON recipes;
-- DROP POLICY IF EXISTS recipes_insert_policy ON recipes;
-- DROP POLICY IF EXISTS recipes_update_policy ON recipes;
-- DROP POLICY IF EXISTS recipes_delete_policy ON recipes;
-- ALTER TABLE recipes DISABLE ROW LEVEL SECURITY;
--
-- DROP POLICY IF EXISTS favorites_select_policy ON favorites;
-- DROP POLICY IF EXISTS favorites_insert_policy ON favorites;
-- DROP POLICY IF EXISTS favorites_delete_policy ON favorites;
-- ALTER TABLE favorites DISABLE ROW LEVEL SECURITY;
--
-- DROP POLICY IF EXISTS meal_plans_select_policy ON meal_plans;
-- DROP POLICY IF EXISTS meal_plans_insert_policy ON meal_plans;
-- DROP POLICY IF EXISTS meal_plans_update_policy ON meal_plans;
-- DROP POLICY IF EXISTS meal_plans_delete_policy ON meal_plans;
-- ALTER TABLE meal_plans DISABLE ROW LEVEL SECURITY;
--
-- DROP POLICY IF EXISTS shopping_lists_select_policy ON shopping_lists;
-- DROP POLICY IF EXISTS shopping_lists_insert_policy ON shopping_lists;
-- DROP POLICY IF EXISTS shopping_lists_update_policy ON shopping_lists;
-- DROP POLICY IF EXISTS shopping_lists_delete_policy ON shopping_lists;
-- ALTER TABLE shopping_lists DISABLE ROW LEVEL SECURITY;
