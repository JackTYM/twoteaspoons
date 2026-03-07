<script setup lang="ts">
interface Props {
  placeholder?: string
  showStrength?: boolean
  required?: boolean
  minlength?: number
}

withDefaults(defineProps<Props>(), {
  placeholder: 'Enter your password',
  showStrength: false,
  required: false,
  minlength: 8,
})

const model = defineModel<string>({ default: '' })
const showPassword = ref(false)

// Password strength calculation
const strength = computed(() => {
  const password = model.value
  if (!password) return { score: 0, label: '', color: '' }

  let score = 0

  // Length checks
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1

  // Character type checks
  if (/[a-z]/.test(password)) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^a-zA-Z0-9]/.test(password)) score += 1

  // Determine strength level
  if (score <= 2) {
    return { score, label: 'Weak', color: 'bg-error-500' }
  } else if (score <= 3) {
    return { score, label: 'Fair', color: 'bg-butter-500' }
  } else if (score <= 4) {
    return { score, label: 'Good', color: 'bg-sage-400' }
  } else {
    return { score, label: 'Strong', color: 'bg-sage-600' }
  }
})

const strengthPercent = computed(() => {
  return Math.min((strength.value.score / 6) * 100, 100)
})

const strengthTextColor = computed(() => {
  switch (strength.value.label) {
    case 'Weak': return 'text-error-500'
    case 'Fair': return 'text-butter-600 dark:text-butter-400'
    case 'Good': return 'text-sage-500'
    case 'Strong': return 'text-sage-600 dark:text-sage-400'
    default: return 'text-neutral-400'
  }
})
</script>

<template>
  <div class="space-y-2">
    <div class="relative">
      <UInput
        v-model="model"
        :type="showPassword ? 'text' : 'password'"
        :placeholder="placeholder"
        icon="i-heroicons-lock-closed"
        :required="required"
        :minlength="minlength"
        size="lg"
        class="pr-10"
      />
      <button
        type="button"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
        tabindex="-1"
        @click="showPassword = !showPassword"
      >
        <UIcon
          :name="showPassword ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
          class="w-5 h-5"
        />
      </button>
    </div>

    <!-- Strength Indicator -->
    <Transition
      enter-active-class="transition-all duration-200"
      leave-active-class="transition-all duration-200"
      enter-from-class="opacity-0 -translate-y-1"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div
        v-if="showStrength && model"
        class="space-y-1"
      >
        <div class="h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-300"
            :class="strength.color"
            :style="{ width: `${strengthPercent}%` }"
          />
        </div>
        <div class="flex items-center justify-between">
          <p
            class="text-xs font-medium"
            :class="strengthTextColor"
          >
            {{ strength.label }}
          </p>
          <p class="text-xs text-neutral-400">
            {{ model.length >= 8 ? '8+ chars' : `${model.length}/8 chars` }}
          </p>
        </div>
      </div>
    </Transition>
  </div>
</template>
