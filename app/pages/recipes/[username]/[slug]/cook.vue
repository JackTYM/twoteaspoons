<script setup lang="ts">
import type { RecipeWithRelations } from '~/types/recipe'

definePageMeta({
  layout: false, // Fullscreen mode
})

const route = useRoute()
const username = computed(() => route.params.username as string)
const slug = computed(() => route.params.slug as string)
const { getAuthHeaders } = useAuth()
const { getRecipeUrl } = useRecipeUrl()

const { data, status, error } = await useFetch<{ recipe: RecipeWithRelations }>(
  `/api/recipes/${username.value}/${slug.value}`,
  {
    headers: getAuthHeaders(),
  }
)

const recipe = computed(() => data.value?.recipe)

// Computed recipe URL for navigation
const recipeUrl = computed(() =>
  recipe.value ? getRecipeUrl(recipe.value) : '/browse'
)

// Set page title
watchEffect(() => {
  if (recipe.value) {
    useSeoMeta({
      title: `Cooking: ${recipe.value.title}`,
    })
  }
})

// Current step (0-indexed)
const currentStep = ref(0)
const totalSteps = computed(() => recipe.value?.instructions.length || 0)

// Navigation
function nextStep(): void {
  if (currentStep.value < totalSteps.value - 1) {
    currentStep.value++
  }
}

function prevStep(): void {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

function goToStep(step: number): void {
  if (step >= 0 && step < totalSteps.value) {
    currentStep.value = step
  }
}

function handleDone(): void {
  navigateTo(recipeUrl.value)
}

// Current instruction
const currentInstruction = computed(() =>
  recipe.value?.instructions[currentStep.value]
)

// Get linked ingredient IDs for current step (for sidebar highlighting)
const currentStepIngredientIds = computed(() => {
  const instruction = currentInstruction.value
  // Support both new ingredientLinks format and legacy ingredientIds
  if (instruction?.ingredientLinks && instruction.ingredientLinks.length > 0) {
    return instruction.ingredientLinks.map(l => l.id)
  }
  if (!instruction?.ingredientIds) return []
  return instruction.ingredientIds
})

// Get the actual ingredient objects for current step with partial amounts
const linkedIngredientsForCurrentStep = computed(() => {
  if (!recipe.value?.ingredients) return []
  const instruction = currentInstruction.value

  // Use new ingredientLinks format if available
  if (instruction?.ingredientLinks && instruction.ingredientLinks.length > 0) {
    return instruction.ingredientLinks
      .map(link => {
        const ingredient = recipe.value?.ingredients[link.id]
        if (!ingredient) return null
        return {
          ingredient,
          partialAmount: link.amount,
          partialUnit: link.unit,
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
  }

  // Fall back to legacy ingredientIds format (full amounts)
  if (instruction?.ingredientIds) {
    return instruction.ingredientIds
      .map(index => {
        const ingredient = recipe.value?.ingredients[index]
        if (!ingredient) return null
        return { ingredient }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
  }

  return []
})

// Ingredients panel
const showIngredients = ref(false)

// Scale for ingredients - read from URL query param
const initialScale = computed(() => {
  const scaleParam = route.query.scale
  if (scaleParam) {
    const parsed = parseFloat(String(scaleParam))
    if (!isNaN(parsed) && parsed > 0 && parsed <= 10) {
      return parsed
    }
  }
  return 1
})
const scale = ref(initialScale.value)

// Wake lock to prevent screen from sleeping
const wakeLock = ref<WakeLockSentinel | null>(null)

async function requestWakeLock(): Promise<void> {
  if ('wakeLock' in navigator) {
    try {
      wakeLock.value = await navigator.wakeLock.request('screen')
    } catch (err) {
      console.warn('Wake lock request failed:', err)
    }
  }
}

function releaseWakeLock(): void {
  if (wakeLock.value) {
    wakeLock.value.release()
    wakeLock.value = null
  }
}

onMounted(() => {
  requestWakeLock()
})

onUnmounted(() => {
  releaseWakeLock()
})

// Re-request wake lock when page becomes visible again
if (import.meta.client) {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !wakeLock.value) {
      requestWakeLock()
    }
  })
}

// Timers
interface Timer {
  id: number
  label: string
  totalSeconds: number
  remainingSeconds: number
  isRunning: boolean
  intervalId: ReturnType<typeof setInterval> | null
}

const timers = ref<Timer[]>([])
let timerIdCounter = 0

function addTimer(minutes: number, label?: string): void {
  const timer: Timer = {
    id: timerIdCounter++,
    label: label || `Step ${currentStep.value + 1}`,
    totalSeconds: minutes * 60,
    remainingSeconds: minutes * 60,
    isRunning: false,
    intervalId: null,
  }
  timers.value.push(timer)
  startTimer(timer.id)
}

function startTimer(timerId: number): void {
  const timer = timers.value.find((t) => t.id === timerId)
  if (!timer || timer.isRunning) return

  timer.isRunning = true
  timer.intervalId = setInterval(() => {
    if (timer.remainingSeconds > 0) {
      timer.remainingSeconds--
    } else {
      // Timer finished
      if (timer.intervalId) {
        clearInterval(timer.intervalId)
        timer.intervalId = null
      }
      timer.isRunning = false
      playAlarm()
    }
  }, 1000)
}

function pauseTimer(timerId: number): void {
  const timer = timers.value.find((t) => t.id === timerId)
  if (!timer || !timer.isRunning) return

  if (timer.intervalId) {
    clearInterval(timer.intervalId)
    timer.intervalId = null
  }
  timer.isRunning = false
}

function removeTimer(timerId: number): void {
  const timer = timers.value.find((t) => t.id === timerId)
  if (timer?.intervalId) {
    clearInterval(timer.intervalId)
  }
  timers.value = timers.value.filter((t) => t.id !== timerId)
}

function playAlarm(): void {
  // Simple beep using Web Audio API
  if (import.meta.client) {
    try {
      const audioContext = new AudioContext()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 800
      oscillator.type = 'sine'
      gainNode.gain.value = 0.3

      oscillator.start()
      setTimeout(() => {
        oscillator.stop()
        audioContext.close()
      }, 500)
    } catch {
      // Audio not supported
    }
  }
}

// Cleanup timers on unmount
onUnmounted(() => {
  timers.value.forEach((timer) => {
    if (timer.intervalId) {
      clearInterval(timer.intervalId)
    }
  })
})

// Keyboard navigation
if (import.meta.client) {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault()
      nextStep()
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      prevStep()
    } else if (e.key === 'Escape') {
      navigateTo(recipeUrl.value)
    } else if (e.key === 'i' || e.key === 'I') {
      showIngredients.value = !showIngredients.value
    }
  })
}
</script>

<template>
  <div class="min-h-screen bg-[#1C1917] text-neutral-100 flex flex-col">
    <!-- Progress Bar -->
    <CookModeProgressBar
      v-if="recipe"
      :current-step="currentStep"
      :total-steps="totalSteps"
    />

    <!-- Loading -->
    <div v-if="status === 'pending'" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <UIcon
          name="i-heroicons-arrow-path"
          class="w-10 h-10 animate-spin text-primary-500 mx-auto mb-4"
        />
        <p class="text-neutral-400">Loading recipe...</p>
      </div>
    </div>

    <!-- Error -->
    <div
      v-else-if="error || !recipe"
      class="flex-1 flex items-center justify-center p-8"
    >
      <div class="text-center">
        <div
          class="w-16 h-16 mx-auto bg-error-900/50 rounded-full flex items-center justify-center mb-4"
        >
          <UIcon
            name="i-heroicons-exclamation-triangle"
            class="w-8 h-8 text-error-400"
          />
        </div>
        <p class="text-xl mb-4 text-neutral-100">Recipe not found</p>
        <UButton :to="recipeUrl" color="primary"> Go Back </UButton>
      </div>
    </div>

    <!-- Cook Mode UI -->
    <template v-else>
      <!-- Header -->
      <header
        class="flex items-center justify-between p-4 border-b border-neutral-700/50 bg-[#1C1917]/80 backdrop-blur-sm"
      >
        <div class="flex items-center gap-4">
          <UButton
            :to="recipeUrl"
            color="neutral"
            variant="ghost"
            icon="i-heroicons-x-mark"
            size="lg"
          />
          <div>
            <h1 class="font-display text-lg text-neutral-100">
              {{ recipe.title }}
            </h1>
            <p class="text-sm text-neutral-400">
              Step {{ currentStep + 1 }} of {{ totalSteps }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Keyboard hints (desktop only) -->
          <div
            class="hidden lg:flex items-center gap-2 text-xs text-neutral-500 mr-4"
          >
            <kbd
              class="px-1.5 py-0.5 bg-neutral-800 rounded border border-neutral-700"
              >←</kbd
            >
            <kbd
              class="px-1.5 py-0.5 bg-neutral-800 rounded border border-neutral-700"
              >→</kbd
            >
            <span>navigate</span>
            <kbd
              class="px-1.5 py-0.5 bg-neutral-800 rounded border border-neutral-700 ml-2"
              >i</kbd
            >
            <span>ingredients</span>
          </div>

          <!-- Ingredients Toggle -->
          <UButton
            color="neutral"
            :variant="showIngredients ? 'solid' : 'ghost'"
            icon="i-heroicons-list-bullet"
            @click="showIngredients = !showIngredients"
          >
            <span class="hidden sm:inline">Ingredients</span>
          </UButton>
        </div>
      </header>

      <!-- Timer Panel -->
      <CookModeTimerPanel
        :timers="timers"
        @start="startTimer"
        @pause="pauseTimer"
        @remove="removeTimer"
      />

      <div class="flex-1 flex overflow-hidden">
        <!-- Main Content -->
        <div class="flex-1 flex flex-col">
          <!-- Step Display -->
          <CookModeStepDisplay
            v-if="currentInstruction"
            :content="currentInstruction.content"
            :step-index="currentStep"
            :timer-minutes="currentInstruction.timerMinutes"
            :linked-ingredients="linkedIngredientsForCurrentStep"
            :scale="scale"
            @start-timer="addTimer"
          />

          <!-- Navigation -->
          <CookModeStepNavigator
            :current-step="currentStep"
            :total-steps="totalSteps"
            :recipe-url="recipeUrl"
            @prev="prevStep"
            @next="nextStep"
            @go-to="goToStep"
            @done="handleDone"
          />
        </div>

        <!-- Ingredients Sidebar -->
        <CookModeIngredientsSidebar
          :ingredients="recipe.ingredients"
          :scale="scale"
          :open="showIngredients"
          :current-step-ingredient-ids="currentStepIngredientIds"
          @update:open="showIngredients = $event"
          @update:scale="scale = $event"
        />
      </div>
    </template>
  </div>
</template>
