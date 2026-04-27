// Database types matching PostgreSQL column names (snake_case)
// These are used for direct Data API queries where we receive raw row data

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

export interface DbFollow {
  follower_id: string
  following_id: string
  created_at: string
}

export interface DbTag {
  id: number
  user_id: string
  name: string
}

export interface DbRecipeTag {
  recipe_id: number
  tag_id: number
}

export interface DbCollectionRecipe {
  collection_id: number
  recipe_id: number
  sort_order: number
  added_at: string
}

export interface DbRecipeCategory {
  recipe_id: number
  category_id: number
}

export interface DbRecipeSlugHistory {
  id: number
  recipe_id: number
  slug: string
  created_at: string
}

// Database schema type for the Neon client
// Maps table names to their row types
export interface Database {
  public: {
    Tables: {
      recipes: {
        Row: DbRecipe
        Insert: Omit<DbRecipe, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<DbRecipe, 'id'>>
      }
      ingredients: {
        Row: DbIngredient
        Insert: Omit<DbIngredient, 'id'>
        Update: Partial<Omit<DbIngredient, 'id'>>
      }
      instructions: {
        Row: DbInstruction
        Insert: Omit<DbInstruction, 'id'>
        Update: Partial<Omit<DbInstruction, 'id'>>
      }
      users: {
        Row: DbUser
        Insert: Omit<DbUser, 'created_at' | 'updated_at'>
        Update: Partial<Omit<DbUser, 'id'>>
      }
      categories: {
        Row: DbCategory
        Insert: Omit<DbCategory, 'id'>
        Update: Partial<Omit<DbCategory, 'id'>>
      }
      collections: {
        Row: DbCollection
        Insert: Omit<DbCollection, 'id' | 'created_at'>
        Update: Partial<Omit<DbCollection, 'id'>>
      }
      favorites: {
        Row: DbFavorite
        Insert: DbFavorite
        Update: Partial<DbFavorite>
      }
      meal_plans: {
        Row: DbMealPlan
        Insert: Omit<DbMealPlan, 'id'>
        Update: Partial<Omit<DbMealPlan, 'id'>>
      }
      shopping_lists: {
        Row: DbShoppingList
        Insert: Omit<DbShoppingList, 'id' | 'created_at'>
        Update: Partial<Omit<DbShoppingList, 'id'>>
      }
      shopping_items: {
        Row: DbShoppingItem
        Insert: Omit<DbShoppingItem, 'id'>
        Update: Partial<Omit<DbShoppingItem, 'id'>>
      }
      comments: {
        Row: DbComment
        Insert: Omit<DbComment, 'id' | 'created_at'>
        Update: Partial<Omit<DbComment, 'id'>>
      }
      follows: {
        Row: DbFollow
        Insert: DbFollow
        Update: Partial<DbFollow>
      }
      tags: {
        Row: DbTag
        Insert: Omit<DbTag, 'id'>
        Update: Partial<Omit<DbTag, 'id'>>
      }
      recipe_tags: {
        Row: DbRecipeTag
        Insert: DbRecipeTag
        Update: Partial<DbRecipeTag>
      }
      collection_recipes: {
        Row: DbCollectionRecipe
        Insert: DbCollectionRecipe
        Update: Partial<DbCollectionRecipe>
      }
      recipe_categories: {
        Row: DbRecipeCategory
        Insert: DbRecipeCategory
        Update: Partial<DbRecipeCategory>
      }
      recipe_slug_history: {
        Row: DbRecipeSlugHistory
        Insert: Omit<DbRecipeSlugHistory, 'id' | 'created_at'>
        Update: Partial<Omit<DbRecipeSlugHistory, 'id'>>
      }
    }
  }
}
