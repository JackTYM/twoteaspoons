<script setup lang="ts">
import type { MealPlanWithRecipe } from '~/services/mealPlanService'

definePageMeta({
  middleware: 'auth',
})

const { getAuthHeaders } = useAuth()
const mealPlanService = useMealPlanService()
const recipeService = useRecipeService()

// Internal types matching component expectations (camelCase)
interface RecipePreview {
  id: number
  title: string
  slug: string
  coverPhoto: string | null
  prepTime: number | null
  cookTime: number | null
  servings: number | null
  author?: { username: string | null } | null
}

interface MealPlan {
  id: number
  recipeId: number
  date: string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  servings: number | null
  recipe: RecipePreview
}

// Transform service data (snake_case) to component format (camelCase)
function transformMealPlan(mp: MealPlanWithRecipe): MealPlan {
  return {
    id: mp.id,
    recipeId: mp.recipe_id,
    date: mp.date,
    mealType: mp.meal_type as 'breakfast' | 'lunch' | 'dinner' | 'snack',
    servings: mp.servings,
    recipe: mp.recipe ? {
      id: mp.recipe.id,
      title: mp.recipe.title,
      slug: mp.recipe.slug,
      coverPhoto: mp.recipe.cover_photo,
      prepTime: mp.recipe.prep_time,
      cookTime: mp.recipe.cook_time,
      servings: mp.recipe.servings,
      author: mp.recipe.author,
    } : {
      id: 0,
      title: 'Unknown Recipe',
      slug: '',
      coverPhoto: null,
      prepTime: null,
      cookTime: null,
      servings: null,
    },
  }
}

// Week navigation
const currentWeekStart = ref(getStartOfWeek(new Date()))

function getStartOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function getEndOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + 6)
  d.setHours(23, 59, 59, 999)
  return d
}

const weekDates = computed(() => {
  const dates: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(currentWeekStart.value)
    d.setDate(d.getDate() + i)
    dates.push(d)
  }
  return dates
})

// Date params as YYYY-MM-DD strings for the service
const weekStartParam = computed(() => currentWeekStart.value.toISOString().split('T')[0])
const weekEndParam = computed(() => getEndOfWeek(currentWeekStart.value).toISOString().split('T')[0])

// Fetch meal plans using the service
const { data: mealPlansRaw, status } = await useAsyncData(
  'meal-plans',
  async () => {
    const result = await mealPlanService.getMealPlans(weekStartParam.value!, weekEndParam.value!)
    return result.data ?? []
  },
  { watch: [weekStartParam, weekEndParam] }
)

// Transform to camelCase for components
const mealPlans = computed(() => (mealPlansRaw.value ?? []).map(transformMealPlan))

function prevWeek(): void {
  const d = new Date(currentWeekStart.value)
  d.setDate(d.getDate() - 7)
  currentWeekStart.value = d
}

function nextWeek(): void {
  const d = new Date(currentWeekStart.value)
  d.setDate(d.getDate() + 7)
  currentWeekStart.value = d
}

function goToToday(): void {
  currentWeekStart.value = getStartOfWeek(new Date())
}

const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'] as const

// Delete meal plan
const deleting = ref(false)

async function removeMealPlan(planId: number): Promise<void> {
  if (!mealPlansRaw.value) return

  // Store the plan for potential rollback
  const removedPlanIndex = mealPlansRaw.value.findIndex(p => p.id === planId)
  if (removedPlanIndex === -1) return
  const removedPlan = mealPlansRaw.value[removedPlanIndex]

  deleting.value = true

  // Optimistic update - splice to trigger reactivity
  mealPlansRaw.value.splice(removedPlanIndex, 1)

  try {
    const { error } = await mealPlanService.deleteMealPlan(planId)
    if (error) {
      throw error
    }
  } catch (err) {
    // Revert on error - add back at original position
    if (mealPlansRaw.value) {
      mealPlansRaw.value.splice(removedPlanIndex, 0, removedPlan!)
    }
    console.error('Failed to remove meal plan:', err)
  }
  deleting.value = false
}

// Add meal plan modal
const showAddModal = ref(false)
const selectedDate = ref<Date | null>(null)
const selectedMealType = ref<string>('dinner')
const addingPlan = ref(false)

// Fetch recipes for the add modal using the service
const { data: recipesRaw } = await useAsyncData(
  'recipes-for-meal-plan',
  () => recipeService.getPublicRecipes()
)

// Transform recipes to the format expected by the modal component
const recipes = computed(() => (recipesRaw.value ?? []).map(r => ({
  id: r.id,
  title: r.title,
  slug: r.slug,
  coverPhoto: r.cover_photo,
  prepTime: r.prep_time,
  cookTime: r.cook_time,
  servings: r.servings,
  author: r.author ? { username: r.author.username } : null,
})))

function openAddModal(date: Date, mealType: string): void {
  selectedDate.value = date
  selectedMealType.value = mealType
  showAddModal.value = true
}

async function addMealPlan(recipeId: number): Promise<void> {
  if (!selectedDate.value || !mealPlansRaw.value) return

  // Find the recipe for optimistic update
  const recipe = recipesRaw.value?.find(r => r.id === recipeId)
  if (!recipe) return

  addingPlan.value = true
  showAddModal.value = false

  // Prepare optimistic data in service format (snake_case)
  const optimisticId = -Date.now() // Temporary negative ID
  const dateStr = selectedDate.value.toISOString().split('T')[0] ?? ''
  const optimisticPlan: MealPlanWithRecipe = {
    id: optimisticId,
    user_id: '', // Will be set by server
    recipe_id: recipeId,
    date: dateStr,
    meal_type: selectedMealType.value as 'breakfast' | 'lunch' | 'dinner' | 'snack',
    servings: recipe.servings ?? 1,
    recipe: {
      id: recipe.id,
      title: recipe.title,
      slug: recipe.slug,
      cover_photo: recipe.cover_photo,
      prep_time: recipe.prep_time,
      cook_time: recipe.cook_time,
      servings: recipe.servings,
      user_id: recipe.user_id,
      author: recipe.author ? { username: recipe.author.username } : undefined,
    },
  }

  // Optimistic update
  mealPlansRaw.value.push(optimisticPlan)

  try {
    const { data: newPlan, error } = await mealPlanService.createMealPlan({
      recipe_id: recipeId,
      date: dateStr,
      meal_type: selectedMealType.value as 'breakfast' | 'lunch' | 'dinner' | 'snack',
      servings: recipe.servings ?? 1,
    })

    if (error) {
      throw error
    }

    // Replace optimistic entry with real data
    if (mealPlansRaw.value && newPlan) {
      const index = mealPlansRaw.value.findIndex(p => p.id === optimisticId)
      if (index !== -1) {
        // Create a proper MealPlanWithRecipe from the returned data
        mealPlansRaw.value[index] = {
          ...newPlan,
          recipe: {
            id: recipe.id,
            title: recipe.title,
            slug: recipe.slug,
            cover_photo: recipe.cover_photo,
            prep_time: recipe.prep_time,
            cook_time: recipe.cook_time,
            servings: recipe.servings,
            user_id: recipe.user_id,
            author: recipe.author ? { username: recipe.author.username } : undefined,
          },
        }
      }
    }
  } catch (err) {
    // Revert optimistic update on error
    if (mealPlansRaw.value) {
      const index = mealPlansRaw.value.findIndex(p => p.id === optimisticId)
      if (index !== -1) {
        mealPlansRaw.value.splice(index, 1)
      }
    }
    console.error('Failed to add meal plan:', err)
  }
  addingPlan.value = false
}

// Generate shopping list from week (still uses server API for now)
const generatingList = ref(false)

const weekLabel = computed(() => {
  const start = currentWeekStart.value
  const end = getEndOfWeek(currentWeekStart.value)
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' })
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' })
  const startDay = start.getDate()
  const endDay = end.getDate()
  const year = start.getFullYear()

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} - ${endDay}, ${year}`
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`
})

async function generateShoppingList(): Promise<void> {
  if (mealPlans.value.length === 0) return

  generatingList.value = true
  try {
    const result = await $fetch<{ list: { id: number; slug: string } }>('/api/shopping-lists', {
      method: 'POST',
      body: {
        name: `Week of ${weekLabel.value}`,
        recipeIds: mealPlans.value.map(p => p.recipeId),
      },
      headers: getAuthHeaders(),
    })
    navigateTo(`/shopping/${result.list.slug}`)
  } catch (err) {
    console.error('Failed to generate shopping list:', err)
  }
  generatingList.value = false
}

// Stats
const totalSlots = computed(() => weekDates.value.length * mealTypes.length)

useSeoMeta({
  title: 'Meal Plan',
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 py-8">
    <!-- Page Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-3xl font-display text-neutral-700 dark:text-neutral-50">
          Meal Plan
        </h1>
        <p class="text-neutral-500 dark:text-neutral-400 mt-1">
          Plan your meals for the week
        </p>
      </div>
    </div>

    <!-- Week Header -->
    <MealPlanWeekHeader
      :week-start="currentWeekStart"
      class="mb-6"
      @prev-week="prevWeek"
      @next-week="nextWeek"
      @today="goToToday"
    />

    <!-- Loading State -->
    <div
      v-if="status === 'pending'"
      class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4"
    >
      <div
        v-for="i in 7"
        :key="i"
        class="h-96 rounded-xl animate-shimmer"
      />
    </div>

    <!-- Calendar Grid -->
    <div
      v-else
      class="mb-6"
    >
      <!-- Desktop: 7 columns -->
      <div class="hidden lg:grid grid-cols-7 gap-2">
        <MealPlanDayColumn
          v-for="date in weekDates"
          :key="date.toISOString()"
          :date="date"
          :meals="mealPlans"
          :meal-types="mealTypes"
          @add-meal="openAddModal"
          @remove-meal="removeMealPlan"
        />
      </div>

      <!-- Tablet: 4 columns (show first 4 days, scroll for rest) -->
      <div class="hidden md:grid lg:hidden grid-cols-4 gap-2 overflow-x-auto">
        <MealPlanDayColumn
          v-for="date in weekDates"
          :key="date.toISOString()"
          :date="date"
          :meals="mealPlans"
          :meal-types="mealTypes"
          class="min-w-[200px]"
          @add-meal="openAddModal"
          @remove-meal="removeMealPlan"
        />
      </div>

      <!-- Mobile: Vertical list -->
      <div class="md:hidden space-y-4">
        <MealPlanDayColumn
          v-for="date in weekDates"
          :key="date.toISOString()"
          :date="date"
          :meals="mealPlans"
          :meal-types="mealTypes"
          @add-meal="openAddModal"
          @remove-meal="removeMealPlan"
        />
      </div>
    </div>

    <!-- Quick Stats -->
    <MealPlanQuickStats
      :meals-planned="mealPlans.length"
      :total-slots="totalSlots"
      :generating="generatingList"
      @generate-list="generateShoppingList"
    />

    <!-- Add Meal Modal -->
    <MealPlanAddMealModal
      v-model:open="showAddModal"
      :date="selectedDate"
      :meal-type="selectedMealType"
      :recipes="recipes"
      :loading="addingPlan"
      @select="addMealPlan"
    />
  </div>
</template>
