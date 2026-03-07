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

interface Props {
  date: Date
  meals: MealPlan[]
  mealTypes: readonly ('breakfast' | 'lunch' | 'dinner' | 'snack')[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  addMeal: [date: Date, mealType: string]
  removeMeal: [planId: number]
}>()

const isToday = computed(() => {
  const today = new Date()
  return props.date.toDateString() === today.toDateString()
})

const dayName = computed(() =>
  props.date.toLocaleDateString('en-US', { weekday: 'short' })
)

const dayNumber = computed(() => props.date.getDate())

const monthName = computed(() =>
  props.date.toLocaleDateString('en-US', { month: 'short' })
)

function getMealsForType(mealType: string): MealPlan[] {
  const dateStr = props.date.toISOString().split('T')[0]
  return props.meals.filter(plan => {
    const planDate = new Date(plan.date).toISOString().split('T')[0]
    return planDate === dateStr && plan.mealType === mealType
  })
}
</script>

<template>
  <div
    class="flex flex-col rounded-xl overflow-hidden transition-all"
    :class="[
      isToday
        ? 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-neutral-950'
        : ''
    ]"
  >
    <!-- Day Header -->
    <div
      class="text-center p-3 transition-colors"
      :class="[
        isToday
          ? 'bg-primary-100 dark:bg-primary-900'
          : 'bg-neutral-100 dark:bg-neutral-800'
      ]"
    >
      <div
        class="text-sm font-medium"
        :class="[
          isToday
            ? 'text-primary-700 dark:text-primary-300'
            : 'text-neutral-500 dark:text-neutral-400'
        ]"
      >
        {{ dayName }}
      </div>
      <div
        class="text-2xl font-display"
        :class="[
          isToday
            ? 'text-primary-700 dark:text-primary-300'
            : 'text-neutral-700 dark:text-neutral-100'
        ]"
      >
        {{ dayNumber }}
      </div>
      <div
        class="text-xs"
        :class="[
          isToday
            ? 'text-primary-600 dark:text-primary-400'
            : 'text-neutral-400 dark:text-neutral-500'
        ]"
      >
        {{ monthName }}
      </div>
    </div>

    <!-- Meal Slots -->
    <div class="flex-1 space-y-1 p-1 bg-neutral-50 dark:bg-neutral-900/50">
      <MealPlanMealSlot
        v-for="mealType in mealTypes"
        :key="mealType"
        :meal-type="mealType"
        :meals="getMealsForType(mealType)"
        :show-label="true"
        @add="emit('addMeal', date, mealType)"
        @remove="emit('removeMeal', $event)"
      />
    </div>
  </div>
</template>
