<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

const { getAuthHeaders } = useAuth()

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

interface MealPlanResponse {
  mealPlans: MealPlan[]
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

const weekStartParam = computed(() => currentWeekStart.value.toISOString())
const weekEndParam = computed(() => getEndOfWeek(currentWeekStart.value).toISOString())

const { data, refresh, status } = await useFetch<MealPlanResponse>('/api/meal-plans', {
  query: {
    start: weekStartParam,
    end: weekEndParam,
  },
  headers: getAuthHeaders(),
})

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
const deleting = ref(false)

async function removeMealPlan(planId: number): Promise<void> {
  if (!data.value) return

  // Store the plan for potential rollback
  const removedPlan = data.value.mealPlans.find(p => p.id === planId)
  if (!removedPlan) return

  deleting.value = true

  // Optimistic update - reassign array to trigger reactivity
  data.value = {
    ...data.value,
    mealPlans: data.value.mealPlans.filter(p => p.id !== planId),
  }

  try {
    await $fetch(`/api/meal-plans/${planId}`, { method: 'DELETE', headers: getAuthHeaders() })
  } catch (err) {
    // Revert on error - add back
    if (data.value) {
      data.value = {
        ...data.value,
        mealPlans: [...data.value.mealPlans, removedPlan],
      }
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

const { data: recipesData } = await useFetch<{ recipes: RecipePreview[] }>('/api/recipes', {
  headers: getAuthHeaders(),
})
const recipes = computed(() => recipesData.value?.recipes || [])

function openAddModal(date: Date, mealType: string): void {
  selectedDate.value = date
  selectedMealType.value = mealType
  showAddModal.value = true
}

async function addMealPlan(recipeId: number): Promise<void> {
  if (!selectedDate.value || !data.value) return

  // Find the recipe for optimistic update
  const recipe = recipes.value.find(r => r.id === recipeId)
  if (!recipe) return

  addingPlan.value = true
  showAddModal.value = false

  // Prepare optimistic data
  const optimisticId = -Date.now() // Temporary negative ID
  const optimisticPlan: MealPlan = {
    id: optimisticId,
    recipeId,
    date: selectedDate.value.toISOString(),
    mealType: selectedMealType.value as MealPlan['mealType'],
    servings: recipe.servings,
    recipe: {
      id: recipe.id,
      title: recipe.title,
      slug: recipe.slug,
      coverPhoto: recipe.coverPhoto,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      servings: recipe.servings,
      author: recipe.author,
    },
  }

  // Optimistic update - reassign array to trigger reactivity
  data.value = {
    ...data.value,
    mealPlans: [...data.value.mealPlans, optimisticPlan],
  }

  try {
    const result = await $fetch<{ mealPlan: MealPlan }>('/api/meal-plans', {
      method: 'POST',
      body: {
        recipeId,
        date: selectedDate.value.toISOString(),
        mealType: selectedMealType.value,
      },
      headers: getAuthHeaders(),
    })

    // Replace optimistic entry with real data
    if (data.value) {
      data.value = {
        ...data.value,
        mealPlans: data.value.mealPlans.map(p =>
          p.id === optimisticId ? result.mealPlan : p
        ),
      }
    }
  } catch (err) {
    // Revert optimistic update on error
    if (data.value) {
      data.value = {
        ...data.value,
        mealPlans: data.value.mealPlans.filter(p => p.id !== optimisticId),
      }
    }
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
