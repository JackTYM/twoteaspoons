import type {
  DbCategory,
  DbCollection,
  DbIngredient,
  DbInstruction,
  DbRecipe,
  DbUser,
} from '~/types/database'

type Timestamp = Date | string

interface RecipeRow {
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
  saveCount: number | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

interface IngredientRow {
  id: number
  recipeId: number
  amount: string | null
  unit: string | null
  item: string
  notes: string | null
  sortOrder: number | null
}

interface InstructionRow {
  id: number
  recipeId: number
  stepNumber: number
  content: string
  timerMinutes: number | null
  photo: string | null
  ingredientIds: string | null
}

interface CategoryRow {
  id: number
  name: string
  slug: string
  icon: string | null
  type: string
  sortOrder: number | null
}

interface UserRow {
  id: string
  email: string
  name: string
  username: string | null
  avatar: string | null
  bio: string | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

interface CollectionRow {
  id: number
  userId: string
  name: string
  slug: string
  description: string | null
  isPublic: boolean | null
  coverPhoto: string | null
  createdAt: Timestamp
}

function serializeTimestamp(value: Timestamp): string {
  return value instanceof Date ? value.toISOString() : value
}

export function serializeRecipe(row: RecipeRow): DbRecipe {
  return {
    id: row.id,
    user_id: row.userId,
    title: row.title,
    slug: row.slug,
    description: row.description,
    cover_photo: row.coverPhoto,
    prep_time: row.prepTime,
    cook_time: row.cookTime,
    servings: row.servings,
    is_published: row.isPublished ?? false,
    source_url: row.sourceUrl,
    source_author: row.sourceAuthor,
    source_site: row.sourceSite,
    forked_from_id: row.forkedFromId,
    avg_taste_rating: row.avgTasteRating,
    avg_difficulty_rating: row.avgDifficultyRating,
    rating_count: row.ratingCount,
    save_count: row.saveCount,
    created_at: serializeTimestamp(row.createdAt),
    updated_at: serializeTimestamp(row.updatedAt),
  }
}

export function serializeIngredient(row: IngredientRow): DbIngredient {
  return {
    id: row.id,
    recipe_id: row.recipeId,
    amount: row.amount,
    unit: row.unit,
    item: row.item,
    notes: row.notes,
    sort_order: row.sortOrder ?? 0,
  }
}

export function serializeInstruction(row: InstructionRow): DbInstruction {
  return {
    id: row.id,
    recipe_id: row.recipeId,
    step_number: row.stepNumber,
    content: row.content,
    timer_minutes: row.timerMinutes,
    photo: row.photo,
    ingredient_ids: row.ingredientIds,
  }
}

export function serializeCategory(row: CategoryRow): DbCategory {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    icon: row.icon,
    type: row.type,
    sort_order: row.sortOrder ?? 0,
  }
}

export function serializeUser(row: UserRow): DbUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    username: row.username,
    avatar: row.avatar,
    bio: row.bio,
    created_at: serializeTimestamp(row.createdAt),
    updated_at: serializeTimestamp(row.updatedAt),
  }
}

export function serializeAuthor(row: UserRow): Pick<DbUser, 'id' | 'name' | 'username' | 'avatar'> {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    avatar: row.avatar,
  }
}

export function serializeCollection(row: CollectionRow): DbCollection {
  return {
    id: row.id,
    user_id: row.userId,
    name: row.name,
    slug: row.slug,
    description: row.description,
    is_public: row.isPublic ?? false,
    cover_photo: row.coverPhoto,
    created_at: serializeTimestamp(row.createdAt),
  }
}
