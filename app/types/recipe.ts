// Shared types for recipes
// These mirror the Drizzle schema types but are defined here for client-side use

export interface User {
  id: number
  email: string
  name: string
  avatar: string | null
  bio: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Recipe {
  id: number
  userId: number
  title: string
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

export interface Instruction {
  id: number
  recipeId: number
  stepNumber: number
  content: string
  timerMinutes: number | null
  photo: string | null
}

export interface RecipeWithRelations extends Recipe {
  author: User
  ingredients: Ingredient[]
  instructions: Instruction[]
}
