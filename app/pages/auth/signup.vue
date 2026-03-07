<script setup lang="ts">
definePageMeta({
  layout: false,
})

useSeoMeta({
  title: 'Sign Up',
  description: 'Create your TwoTeaspoons account',
})

const { signUp, isAuthenticated, isAnonymous } = useAuth()

const form = reactive({
  name: '',
  email: '',
  password: '',
})
const acceptTerms = ref(false)
const error = ref('')
const loading = ref(false)

// Redirect if already signed in (not anonymous)
watch([isAuthenticated, isAnonymous], ([authenticated, anonymous]) => {
  if (authenticated && !anonymous) {
    navigateTo('/browse')
  }
}, { immediate: true })

async function handleSubmit(): Promise<void> {
  error.value = ''
  loading.value = true

  const result = await signUp(form.email, form.password, form.name)

  if (result.error) {
    error.value = result.error
  } else {
    navigateTo('/browse')
  }

  loading.value = false
}
</script>

<template>
  <AuthAuthLayout
    title="Create your account"
    subtitle="Start building your recipe collection"
  >
    <UCard class="bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 shadow-lg">
      <form
        class="space-y-5"
        @submit.prevent="handleSubmit"
      >
        <!-- Error Alert -->
        <Transition
          enter-active-class="transition-all duration-200"
          leave-active-class="transition-all duration-200"
          enter-from-class="opacity-0 -translate-y-2"
          leave-to-class="opacity-0 -translate-y-2"
        >
          <UAlert
            v-if="error"
            color="error"
            variant="soft"
            :title="error"
            icon="i-heroicons-exclamation-circle"
            class="mb-4"
          />
        </Transition>

        <!-- Name -->
        <UFormField
          label="Name"
          name="name"
        >
          <UInput
            v-model="form.name"
            type="text"
            placeholder="Your name"
            icon="i-heroicons-user"
            required
            autofocus
            size="lg"
          />
        </UFormField>

        <!-- Email -->
        <UFormField
          label="Email"
          name="email"
        >
          <UInput
            v-model="form.email"
            type="email"
            placeholder="you@example.com"
            icon="i-heroicons-envelope"
            required
            size="lg"
          />
        </UFormField>

        <!-- Password with Strength -->
        <UFormField
          label="Password"
          name="password"
        >
          <AuthPasswordInput
            v-model="form.password"
            placeholder="Create a password"
            show-strength
            required
            :minlength="8"
          />
        </UFormField>

        <!-- Terms Checkbox -->
        <UCheckbox v-model="acceptTerms">
          <template #label>
            <span class="text-sm text-neutral-600 dark:text-neutral-400">
              I agree to the
              <NuxtLink
                to="/terms"
                class="text-primary-600 dark:text-primary-400 hover:underline"
              >
                Terms of Service
              </NuxtLink>
              and
              <NuxtLink
                to="/privacy"
                class="text-primary-600 dark:text-primary-400 hover:underline"
              >
                Privacy Policy
              </NuxtLink>
            </span>
          </template>
        </UCheckbox>

        <!-- Submit -->
        <UButton
          type="submit"
          color="primary"
          block
          size="lg"
          :loading="loading"
          :disabled="!acceptTerms"
          class="press-effect"
        >
          Create account
        </UButton>
      </form>

      <!-- Divider -->
      <div class="relative my-6">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-neutral-200 dark:border-neutral-700" />
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="px-3 bg-white dark:bg-neutral-800 text-neutral-500">
            Or continue with
          </span>
        </div>
      </div>

      <!-- Social Login -->
      <AuthSocialLoginButtons />

      <!-- Sign In Link -->
      <p class="text-center text-sm text-neutral-500 dark:text-neutral-400 mt-6">
        Already have an account?
        <NuxtLink
          to="/auth/signin"
          class="text-primary-600 dark:text-primary-400 font-medium hover:underline"
        >
          Sign in
        </NuxtLink>
      </p>
    </UCard>
  </AuthAuthLayout>
</template>
