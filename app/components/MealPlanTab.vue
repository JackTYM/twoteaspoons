<script setup lang="ts">
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

const { getAuthHeaders } = useAuth()
const mealPlanService = useMealPlanService()
const recipeService = useRecipeService()

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

const weekStartParam = computed(() => currentWeekStart.value.toISOString().split('T')[0])
const weekEndParam = computed(() => getEndOfWeek(currentWeekStart.value).toISOString().split('T')[0])

const { data, refresh, status } = await useAsyncData(
  'meal-plans',
  async () => {
    const start = weekStartParam.value ?? ''
    const end = weekEndParam.value ?? ''
    if (!start || !end) {
      return { mealPlans: [] as MealPlan[] }
    }
    const result = await mealPlanService.getMealPlans(start, end)
    if (result.error) {
      console.error('Failed to fetch meal plans:', result.error)
      return { mealPlans: [] as MealPlan[] }
    }
    // Transform snake_case to camelCase for compatibility with existing template
    const mealPlans: MealPlan[] = (result.data || []).map(mp => ({
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
    }))
    return { mealPlans }
  },
  { watch: [weekStartParam] }
)

const mealPlans = computed(() => data.value?.mealPlans || [])

function prevWeek(): void {
  const d = new Date(currentWeekStart.value)
  d.setDate(d.getDate() - 7)
  currentWeekStart.value = d
  refresh()
}

function nextWeek(): void {
  const d = new Date(currentWeekStart.value)
  d.setDate(d.getDate() + 7)
  currentWeekStart.value = d
  refresh()
}

function goToToday(): void {
  currentWeekStart.value = getStartOfWeek(new Date())
  refresh()
}

const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'] as const

// Delete meal plan
async function removeMealPlan(planId: number): Promise<void> {
  try {
    const { error } = await mealPlanService.deleteMealPlan(planId)
    if (error) {
      throw error
    }
    refresh()
  } catch (err) {
    console.error('Failed to remove meal plan:', err)
  }
}

// Add meal plan modal
const showAddModal = ref(false)
const selectedDate = ref<Date | null>(null)
const selectedMealType = ref<string>('dinner')
const addingPlan = ref(false)

const { data: recipesData } = await useAsyncData('public-recipes-for-meal-plan', async () => {
  const recipes = await recipeService.getPublicRecipes()
  // Transform snake_case to camelCase for compatibility with existing template
  const transformedRecipes: RecipePreview[] = recipes.map(r => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    coverPhoto: r.cover_photo,
    prepTime: r.prep_time,
    cookTime: r.cook_time,
    servings: r.servings,
    author: r.author ? { username: r.author.username } : null,
  }))
  return { recipes: transformedRecipes }
})
const recipes = computed(() => recipesData.value?.recipes || [])

function openAddModal(date: Date, mealType: string): void {
  selectedDate.value = date
  selectedMealType.value = mealType
  showAddModal.value = true
}

async function addMealPlan(recipeId: number): Promise<void> {
  const date = selectedDate.value
  if (!date) return

  addingPlan.value = true
  try {
    const dateStr = date.toISOString().split('T')[0]
    if (!dateStr) return
    const { error } = await mealPlanService.createMealPlan({
      recipe_id: recipeId,
      date: dateStr,
      meal_type: selectedMealType.value as 'breakfast' | 'lunch' | 'dinner' | 'snack',
    })
    if (error) {
      throw error
    }
    showAddModal.value = false
    refresh()
  } catch (err) {
    console.error('Failed to add meal plan:', err)
  }
  addingPlan.value = false
}

// Generate shopping list from week
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
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-display text-neutral-700 dark:text-neutral-50">
          Meal Plan
        </h2>
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

    <!-- Loading State (only on initial load, not refresh) -->
    <div
      v-if="status === 'pending' && !data"
      class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4"
    >
      <div
        v-for="i in 7"
        :key="i"
        class="h-96 rounded-xl animate-shimmer"
      />
    </div>

    <!-- Calendar Grid -->
    <Transition
      name="fade"
      mode="out-in"
    >
      <div
        :key="currentWeekStart.toISOString()"
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
    </Transition>

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
