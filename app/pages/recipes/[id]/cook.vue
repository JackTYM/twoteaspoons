<script setup lang="ts">
import type { RecipeWithRelations } from '~/types/recipe'

definePageMeta({
  layout: false, // Fullscreen mode
})

const route = useRoute()
const id = computed(() => route.params.id as string)

const { data, status, error } = await useFetch<{ recipe: RecipeWithRelations }>(`/api/recipes/${id.value}`)

const recipe = computed(() => data.value?.recipe)

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

// Current instruction
const currentInstruction = computed(() =>
  recipe.value?.instructions[currentStep.value]
)

// Ingredients panel
const showIngredients = ref(false)

// Scale for ingredients
const scale = ref(1)

function scaledAmount(amount: string | null): string {
  if (!amount) return ''
  const num = parseFloat(amount)
  if (isNaN(num)) return amount
  const scaled = num * scale.value
  if (scaled === Math.floor(scaled)) return String(scaled)
  if (scaled < 1) return scaled.toFixed(2).replace(/\.?0+$/, '')
  return scaled.toFixed(1).replace(/\.?0+$/, '')
}

// Wake lock to prevent screen from sleeping
const wakeLock = ref<WakeLockSentinel | null>(null)
const wakeLockSupported = ref(false)

async function requestWakeLock(): Promise<void> {
  if ('wakeLock' in navigator) {
    wakeLockSupported.value = true
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

function addTimer(minutes: number, label: string): void {
  const timer: Timer = {
    id: timerIdCounter++,
    label,
    totalSeconds: minutes * 60,
    remainingSeconds: minutes * 60,
    isRunning: false,
    intervalId: null,
  }
  timers.value.push(timer)
  startTimer(timer.id)
}

function startTimer(id: number): void {
  const timer = timers.value.find(t => t.id === id)
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

function pauseTimer(id: number): void {
  const timer = timers.value.find(t => t.id === id)
  if (!timer || !timer.isRunning) return

  if (timer.intervalId) {
    clearInterval(timer.intervalId)
    timer.intervalId = null
  }
  timer.isRunning = false
}

function removeTimer(id: number): void {
  const timer = timers.value.find(t => t.id === id)
  if (timer?.intervalId) {
    clearInterval(timer.intervalId)
  }
  timers.value = timers.value.filter(t => t.id !== id)
}

function formatTimerTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
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
  timers.value.forEach(timer => {
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
      navigateTo(`/recipes/${id.value}`)
    }
  })
}
</script>

<template>
  <div class="min-h-screen bg-neutral-900 text-neutral-100 flex flex-col">
    <!-- Loading -->
    <div
      v-if="status === 'pending'"
      class="flex-1 flex items-center justify-center"
    >
      <UIcon
        name="i-heroicons-arrow-path"
        class="w-8 h-8 animate-spin"
      />
    </div>

    <!-- Error -->
    <div
      v-else-if="error || !recipe"
      class="flex-1 flex items-center justify-center p-8"
    >
      <div class="text-center">
        <p class="text-xl mb-4">Recipe not found</p>
        <UButton
          :to="`/recipes/${id}`"
          color="primary"
        >
          Go Back
        </UButton>
      </div>
    </div>

    <!-- Cook Mode UI -->
    <template v-else>
      <!-- Header -->
      <header class="flex items-center justify-between p-4 border-b border-neutral-800">
        <div class="flex items-center gap-4">
          <UButton
            :to="`/recipes/${id}`"
            color="neutral"
            variant="ghost"
            icon="i-heroicons-x-mark"
            size="lg"
          />
          <div>
            <h1 class="font-semibold text-lg">{{ recipe.title }}</h1>
            <p class="text-sm text-neutral-400">
              Step {{ currentStep + 1 }} of {{ totalSteps }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Active Timers -->
          <div
            v-for="timer in timers"
            :key="timer.id"
            class="flex items-center gap-2 px-3 py-2 rounded-lg"
            :class="timer.remainingSeconds === 0 ? 'bg-error-600 animate-pulse' : 'bg-neutral-800'"
          >
            <span class="font-mono text-lg">{{ formatTimerTime(timer.remainingSeconds) }}</span>
            <UButton
              v-if="timer.isRunning"
              color="neutral"
              variant="ghost"
              icon="i-heroicons-pause"
              size="xs"
              @click="pauseTimer(timer.id)"
            />
            <UButton
              v-else-if="timer.remainingSeconds > 0"
              color="neutral"
              variant="ghost"
              icon="i-heroicons-play"
              size="xs"
              @click="startTimer(timer.id)"
            />
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-x-mark"
              size="xs"
              @click="removeTimer(timer.id)"
            />
          </div>

          <!-- Ingredients Toggle -->
          <UButton
            color="neutral"
            :variant="showIngredients ? 'solid' : 'ghost'"
            icon="i-heroicons-list-bullet"
            @click="showIngredients = !showIngredients"
          >
            Ingredients
          </UButton>
        </div>
      </header>

      <div class="flex-1 flex">
        <!-- Main Content -->
        <div class="flex-1 flex flex-col">
          <!-- Step Content -->
          <div class="flex-1 flex items-center justify-center p-8">
            <div class="max-w-3xl text-center">
              <p class="text-3xl md:text-4xl lg:text-5xl leading-relaxed">
                {{ currentInstruction?.content }}
              </p>

              <!-- Timer Button (if step has timer) -->
              <div
                v-if="currentInstruction?.timerMinutes"
                class="mt-8"
              >
                <UButton
                  color="warning"
                  size="lg"
                  icon="i-heroicons-clock"
                  @click="addTimer(currentInstruction.timerMinutes!, `Step ${currentStep + 1}`)"
                >
                  Start {{ currentInstruction.timerMinutes }} min timer
                </UButton>
              </div>
            </div>
          </div>

          <!-- Navigation -->
          <div class="flex items-center justify-between p-4 border-t border-neutral-800">
            <UButton
              color="neutral"
              variant="outline"
              icon="i-heroicons-chevron-left"
              size="lg"
              :disabled="currentStep === 0"
              @click="prevStep"
            >
              Previous
            </UButton>

            <!-- Step Dots -->
            <div class="flex items-center gap-2">
              <button
                v-for="(_, i) in totalSteps"
                :key="i"
                class="w-3 h-3 rounded-full transition-all"
                :class="i === currentStep ? 'bg-primary-500 scale-125' : 'bg-neutral-600 hover:bg-neutral-500'"
                @click="goToStep(i)"
              />
            </div>

            <UButton
              v-if="currentStep < totalSteps - 1"
              color="primary"
              size="lg"
              trailing-icon="i-heroicons-chevron-right"
              @click="nextStep"
            >
              Next
            </UButton>
            <UButton
              v-else
              color="success"
              size="lg"
              icon="i-heroicons-check"
              :to="`/recipes/${id}`"
            >
              Done!
            </UButton>
          </div>
        </div>

        <!-- Ingredients Sidebar -->
        <aside
          v-if="showIngredients"
          class="w-80 border-l border-neutral-800 p-4 overflow-y-auto bg-neutral-800/50"
        >
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold">Ingredients</h2>
            <div class="flex gap-1">
              <UButton
                v-for="s in [0.5, 1, 2]"
                :key="s"
                size="xs"
                :color="scale === s ? 'primary' : 'neutral'"
                :variant="scale === s ? 'solid' : 'ghost'"
                @click="scale = s"
              >
                {{ s === 1 ? '1x' : s < 1 ? '½x' : `${s}x` }}
              </UButton>
            </div>
          </div>

          <ul class="space-y-2">
            <li
              v-for="ingredient in recipe.ingredients"
              :key="ingredient.id"
              class="flex items-baseline gap-2 text-neutral-300"
            >
              <span class="font-medium">
                {{ scaledAmount(ingredient.amount) }} {{ ingredient.unit }}
              </span>
              <span>{{ ingredient.item }}</span>
            </li>
          </ul>
        </aside>
      </div>
    </template>
  </div>
</template>
