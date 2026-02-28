<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

interface RecipePreview {
  id: number
  title: string
  coverPhoto: string | null
  prepTime: number | null
  cookTime: number | null
  servings: number | null
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

const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'] as const

function getMealsForSlot(date: Date, mealType: string): MealPlan[] {
  const dateStr = date.toISOString().split('T')[0]
  return mealPlans.value.filter(plan => {
    const planDate = new Date(plan.date).toISOString().split('T')[0]
    return planDate === dateStr && plan.mealType === mealType
  })
}

function formatDay(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short' })
}

function formatDate(date: Date): string {
  return date.getDate().toString()
}

function isToday(date: Date): boolean {
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

// Delete meal plan
const deleting = ref(false)

async function removeMealPlan(planId: number): Promise<void> {
  deleting.value = true
  try {
    await $fetch(`/api/meal-plans/${planId}`, { method: 'DELETE' })
    refresh()
  } catch (err) {
    console.error('Failed to remove meal plan:', err)
  }
  deleting.value = false
}

// Add meal plan modal
const showAddModal = ref(false)
const selectedDate = ref<Date | null>(null)
const selectedMealType = ref<string>('dinner')
const addingPlan = ref(false)

interface RecipeListItem {
  id: number
  title: string
}

interface SelectOption {
  label: string
  value: number
}

const { data: recipesData } = await useFetch<{ recipes: RecipeListItem[] }>('/api/recipes')
const recipeOptions = computed((): SelectOption[] =>
  (recipesData.value?.recipes || []).map(r => ({ label: r.title, value: r.id }))
)

const selectedRecipe = ref<SelectOption | undefined>(undefined)

function openAddModal(date: Date, mealType: string): void {
  selectedDate.value = date
  selectedMealType.value = mealType
  selectedRecipe.value = undefined
  showAddModal.value = true
}

async function addMealPlan(): Promise<void> {
  if (!selectedDate.value || !selectedRecipe.value) return

  addingPlan.value = true
  try {
    await $fetch('/api/meal-plans', {
      method: 'POST',
      body: {
        recipeId: selectedRecipe.value.value,
        date: selectedDate.value.toISOString(),
        mealType: selectedMealType.value,
      },
    })
    showAddModal.value = false
    refresh()
  } catch (err) {
    console.error('Failed to add meal plan:', err)
  }
  addingPlan.value = false
}

// Generate shopping list from week
const generatingList = ref(false)

async function generateShoppingList(): Promise<void> {
  if (mealPlans.value.length === 0) return

  generatingList.value = true
  try {
    const result = await $fetch<{ shoppingList: { id: number } }>('/api/shopping-lists', {
      method: 'POST',
      body: {
        name: `Week of ${weekLabel.value}`,
        recipeIds: mealPlans.value.map(p => p.recipeId),
      },
    })
    navigateTo(`/shopping/${result.shoppingList.id}`)
  } catch (err) {
    console.error('Failed to generate shopping list:', err)
  }
  generatingList.value = false
}

useSeoMeta({
  title: 'Meal Plan',
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 py-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold text-neutral-700 dark:text-neutral-50">
          Meal Plan
        </h1>
        <p class="text-neutral-500 dark:text-neutral-400 mt-1">
          Plan your meals for the week
        </p>
      </div>

      <div class="flex gap-2">
        <UButton
          v-if="mealPlans.length > 0"
          color="primary"
          icon="i-heroicons-shopping-cart"
          :loading="generatingList"
          @click="generateShoppingList"
        >
          Generate Shopping List
        </UButton>
      </div>
    </div>

    <!-- Week Navigation -->
    <div class="flex items-center justify-between mb-6 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-4">
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-heroicons-chevron-left"
        @click="prevWeek"
      />

      <div class="flex items-center gap-4">
        <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">
          {{ weekLabel }}
        </h2>
        <UButton
          size="sm"
          color="neutral"
          variant="outline"
          @click="goToToday"
        >
          Today
        </UButton>
      </div>

      <UButton
        color="neutral"
        variant="ghost"
        icon="i-heroicons-chevron-right"
        @click="nextWeek"
      />
    </div>

    <!-- Loading -->
    <div
      v-if="status === 'pending'"
      class="grid grid-cols-7 gap-2"
    >
      <USkeleton
        v-for="i in 28"
        :key="i"
        class="h-24"
      />
    </div>

    <!-- Calendar Grid -->
    <div
      v-else
      class="overflow-x-auto"
    >
      <div class="grid grid-cols-7 gap-1 min-w-[800px]">
        <!-- Day Headers -->
        <div
          v-for="date in weekDates"
          :key="date.toISOString()"
          class="text-center p-2 rounded-t-lg"
          :class="isToday(date) ? 'bg-primary-100 dark:bg-primary-900' : 'bg-neutral-100 dark:bg-neutral-800'"
        >
          <div
            class="text-sm font-medium"
            :class="isToday(date) ? 'text-primary-700 dark:text-primary-300' : 'text-neutral-500 dark:text-neutral-400'"
          >
            {{ formatDay(date) }}
          </div>
          <div
            class="text-lg font-bold"
            :class="isToday(date) ? 'text-primary-700 dark:text-primary-300' : 'text-neutral-700 dark:text-neutral-100'"
          >
            {{ formatDate(date) }}
          </div>
        </div>

        <!-- Meal Type Rows -->
        <template
          v-for="mealType in mealTypes"
          :key="mealType"
        >
          <div
            v-for="date in weekDates"
            :key="`${date.toISOString()}-${mealType}`"
            class="min-h-24 p-1 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700"
          >
            <!-- Meal Type Label (first column only) -->
            <div
              v-if="weekDates.indexOf(date) === 0"
              class="text-xs font-medium text-neutral-400 uppercase mb-1"
            >
              {{ mealType }}
            </div>

            <!-- Meals in this slot -->
            <div class="space-y-1">
              <div
                v-for="meal in getMealsForSlot(date, mealType)"
                :key="meal.id"
                class="group relative p-2 bg-white dark:bg-neutral-800 rounded border border-neutral-200 dark:border-neutral-700 hover:border-primary-500 transition-colors"
              >
                <NuxtLink
                  :to="`/recipes/${meal.recipeId}`"
                  class="text-xs font-medium text-neutral-700 dark:text-neutral-100 line-clamp-2"
                >
                  {{ meal.recipe.title }}
                </NuxtLink>
                <button
                  class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-error-500 hover:bg-error-50 dark:hover:bg-error-900/20 rounded"
                  :disabled="deleting"
                  @click.prevent="removeMealPlan(meal.id)"
                >
                  <UIcon
                    name="i-heroicons-x-mark"
                    class="w-3 h-3"
                  />
                </button>
              </div>
            </div>

            <!-- Add Button -->
            <button
              class="w-full mt-1 p-1 text-neutral-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded flex items-center justify-center transition-colors"
              @click="openAddModal(date, mealType)"
            >
              <UIcon
                name="i-heroicons-plus"
                class="w-4 h-4"
              />
            </button>
          </div>
        </template>
      </div>
    </div>

    <!-- Add Meal Modal -->
    <UModal v-model:open="showAddModal">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold text-neutral-700 dark:text-neutral-100">
              Add to Meal Plan
            </h3>
          </template>

          <div class="space-y-4">
            <p class="text-sm text-neutral-500">
              {{ selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) }}
              - {{ selectedMealType }}
            </p>

            <UFormField label="Select Recipe">
              <USelectMenu
                v-model="selectedRecipe"
                :items="recipeOptions"
                placeholder="Choose a recipe..."
              />
            </UFormField>
          </div>

          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton
                color="neutral"
                variant="outline"
                @click="showAddModal = false"
              >
                Cancel
              </UButton>
              <UButton
                color="primary"
                :loading="addingPlan"
                :disabled="!selectedRecipe"
                @click="addMealPlan"
              >
                Add to Plan
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
