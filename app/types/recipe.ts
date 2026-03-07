// Shared types for recipes
// These mirror the Drizzle schema types but are defined here for client-side use

export interface User {
  id: string
  email: string
  name: string
  username: string | null
  avatar: string | null
  bio: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Recipe {
  id: number
  userId: string
  title: string
  slug: string
  description: string | null
  coverPhoto: string | null
  prepTime: number | null
  cookTime: number | null
  servings: number | null
  isPublished: boolean | null
  sourceUrl: string | null
  sourceAuthor: string | null
  sourceSite: string | null
  forkedFromId: number | null
  avgTasteRating: string | null
  avgDifficultyRating: string | null
  ratingCount: number | null
  createdAt: Date
  updatedAt: Date
}

export interface Ingredient {
  id: number
  recipeId: number
  amount: string | null
  unit: string | null
  item: string
  notes: string | null
  sortOrder: number | null
}

// Represents a link from an instruction to an ingredient with optional partial amount
export interface IngredientLink {
  id: number // Index into ingredients array
  amount?: string | null // Partial amount used in this step (e.g., "1")
  unit?: string | null // Unit for this partial (e.g., "tsp")
}

export interface Instruction {
  id: number
  recipeId: number
  stepNumber: number
  content: string
  timerMinutes: number | null
  photo: string | null
  ingredientIds: number[] | null // Legacy: Indices of ingredients linked to this step
  ingredientLinks?: IngredientLink[] | null // New: Links with optional partial amounts
}

export interface RecipeCategory {
  id: number
  name: string
  slug: string
  icon: string | null
  type: string
}

export interface RecipeWithRelations extends Recipe {
  author: User
  ingredients: Ingredient[]
  instructions: Instruction[]
  categories?: RecipeCategory[]
}
