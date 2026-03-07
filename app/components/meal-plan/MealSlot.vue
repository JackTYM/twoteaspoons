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
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  meals: MealPlan[]
  showLabel?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showLabel: false,
})

const emit = defineEmits<{
  add: []
  remove: [planId: number]
}>()

const mealTypeConfig = computed(() => {
  switch (props.mealType) {
    case 'breakfast':
      return {
        label: 'Breakfast',
        icon: 'i-heroicons-sun',
        color: 'text-butter-500 dark:text-butter-400',
      }
    case 'lunch':
      return {
        label: 'Lunch',
        icon: 'i-heroicons-sun',
        color: 'text-primary-500 dark:text-primary-400',
      }
    case 'dinner':
      return {
        label: 'Dinner',
        icon: 'i-heroicons-moon',
        color: 'text-sage-600 dark:text-sage-400',
      }
    case 'snack':
      return {
        label: 'Snack',
        icon: 'i-heroicons-cake',
        color: 'text-terracotta-500 dark:text-terracotta-400',
      }
    default:
      return {
        label: 'Meal',
        icon: 'i-heroicons-fire',
        color: 'text-neutral-500',
      }
  }
})
</script>

<template>
  <div class="min-h-[100px] p-2 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 transition-colors">
    <!-- Meal Type Label -->
    <div
      v-if="showLabel"
      class="flex items-center gap-1.5 mb-2"
    >
      <UIcon
        :name="mealTypeConfig.icon"
        class="w-3.5 h-3.5"
        :class="mealTypeConfig.color"
      />
      <span class="text-xs font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
        {{ mealTypeConfig.label }}
      </span>
    </div>

    <!-- Meals -->
    <div class="space-y-2">
      <MealPlanMealCard
        v-for="meal in meals"
        :key="meal.id"
        :plan-id="meal.id"
        :recipe="meal.recipe"
        :meal-type="mealType"
        @remove="emit('remove', $event)"
      />
    </div>

    <!-- Add Button (Empty State or Additional) -->
    <button
      type="button"
      class="w-full mt-2 p-2 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg text-neutral-400 dark:text-neutral-500 hover:border-primary-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all flex items-center justify-center gap-1"
      @click="emit('add')"
    >
      <UIcon
        name="i-heroicons-plus"
        class="w-4 h-4"
      />
      <span
        v-if="meals.length === 0"
        class="text-xs"
      >
        Add {{ mealTypeConfig.label.toLowerCase() }}
      </span>
    </button>
  </div>
</template>
