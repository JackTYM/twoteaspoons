// Typed schema for recipe imports
// Category slugs are typed to ensure only valid values are accepted

// Meal type categories
export type MealType =
  | 'breakfast'
  | 'brunch'
  | 'lunch'
  | 'dinner'
  | 'snack'
  | 'dessert'
  | 'appetizer'
  | 'side-dish'
  | 'drink'
  | 'sauce'

// Cuisine categories
export type Cuisine =
  | 'italian'
  | 'mexican'
  | 'chinese'
  | 'japanese'
  | 'korean'
  | 'thai'
  | 'vietnamese'
  | 'indian'
  | 'mediterranean'
  | 'greek'
  | 'middle-eastern'
  | 'french'
  | 'spanish'
  | 'american'
  | 'southern'
  | 'cajun'
  | 'caribbean'
  | 'african'
  | 'british'
  | 'german'
  | 'brazilian'
  | 'peruvian'

// Dietary categories
export type Dietary =
  | 'vegetarian'
  | 'vegan'
  | 'gluten-free'
  | 'dairy-free'
  | 'nut-free'
  | 'egg-free'
  | 'keto'
  | 'low-carb'
  | 'paleo'
  | 'whole30'
  | 'low-sodium'
  | 'low-fat'
  | 'high-protein'
  | 'diabetic-friendly'
  | 'heart-healthy'
  | 'kosher'
  | 'halal'

// Cooking style categories
export type CookingStyle =
  | 'quick-easy'
  | '30-min'
  | '15-min'
  | 'one-pot'
  | 'one-pan'
  | 'sheet-pan'
  | 'slow-cooker'
  | 'instant-pot'
  | 'air-fryer'
  | 'grilling'
  | 'no-cook'
  | 'make-ahead'
  | 'freezer-friendly'
  | 'meal-prep'
  | 'batch-cooking'
  | 'budget-friendly'

// Dish type categories
export type DishType =
  | 'soup'
  | 'salad'
  | 'sandwich'
  | 'pasta'
  | 'pizza'
  | 'stir-fry'
  | 'curry'
  | 'casserole'
  | 'stew'
  | 'roast'
  | 'tacos'
  | 'burger'
  | 'bowl'
  | 'wrap'
  | 'noodles'
  | 'rice-dish'
  | 'bread'
  | 'cake'
  | 'cookies'
  | 'pie'
  | 'smoothie'
  | 'cocktail'

// Protein categories
export type Protein =
  | 'chicken'
  | 'beef'
  | 'pork'
  | 'fish'
  | 'shrimp'
  | 'seafood'
  | 'turkey'
  | 'lamb'
  | 'tofu'
  | 'beans'
  | 'eggs'

// Occasion categories
export type Occasion =
  | 'weeknight'
  | 'date-night'
  | 'party'
  | 'potluck'
  | 'holiday'
  | 'thanksgiving'
  | 'christmas'
  | 'easter'
  | 'july-4th'
  | 'game-day'
  | 'bbq'
  | 'picnic'
  | 'camping'
  | 'kids'
  | 'comfort-food'
  | 'healthy'
  | 'indulgent'

// Season categories
export type Season = 'spring' | 'summer' | 'fall' | 'winter'

// Combined category type - can be any valid category slug
export type CategorySlug =
  | MealType
  | Cuisine
  | Dietary
  | CookingStyle
  | DishType
  | Protein
  | Occasion
  | Season

// Ingredient import schema
export interface ImportIngredient {
  amount?: string | number | null
  unit?: string | null
  item: string
  notes?: string | null
}

// Instruction import schema
export interface ImportInstruction {
  content: string
  timerMinutes?: number | null
  // Link to ingredient indices (0-based) for cook mode highlighting
  ingredientIndices?: number[] | null
}

// Full recipe import schema
export interface ImportRecipe {
  title: string
  description?: string | null
  coverPhoto?: string | null
  prepTime?: number | null
  cookTime?: number | null
  servings?: number | null

  // Source attribution
  source?: {
    url?: string | null
    author?: string | null
    site?: string | null
  } | null

  // Categories by slug (typed)
  categories?: CategorySlug[] | null

  // Structured ingredients
  ingredients: ImportIngredient[]

  // Structured instructions
  instructions: ImportInstruction[]
}

// Bulk import request schema
export interface ImportRequest {
  recipes: ImportRecipe[]
}

// Import result for each recipe
export interface ImportRecipeResult {
  title: string
  success: boolean
  recipeId?: number
  slug?: string
  error?: string
}

// Bulk import response
export interface ImportResponse {
  total: number
  successful: number
  failed: number
  results: ImportRecipeResult[]
}
