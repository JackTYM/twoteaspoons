<script setup lang="ts">
definePageMeta({
  layout: false,
})

useSeoMeta({
  title: 'Sign In',
  description: 'Sign in to your TwoTeaspoons account',
})

const { signIn, isAuthenticated, isAnonymous } = useAuth()

const form = reactive({
  email: '',
  password: '',
})
const rememberMe = ref(false)
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

  const result = await signIn(form.email, form.password)

  if (result.error) {
    error.value = result.error
  } else {
    navigateTo('/browse')
  }

  loading.value = false
}
</script>

<template>
  <AuthLayout
    title="Welcome back"
    subtitle="Sign in to access your recipes"
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
            autofocus
            size="lg"
          />
        </UFormField>

        <!-- Password -->
        <UFormField
          label="Password"
          name="password"
        >
          <AuthPasswordInput
            v-model="form.password"
            placeholder="Enter your password"
            required
          />
        </UFormField>

        <!-- Remember Me & Forgot -->
        <div class="flex items-center justify-between">
          <UCheckbox
            v-model="rememberMe"
            label="Remember me"
          />
          <NuxtLink
            to="/auth/forgot"
            class="text-sm text-primary-600 dark:text-primary-400 hover:underline"
          >
            Forgot password?
          </NuxtLink>
        </div>

        <!-- Submit -->
        <UButton
          type="submit"
          color="primary"
          block
          size="lg"
          :loading="loading"
          class="press-effect"
        >
          Sign in
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

      <!-- Sign Up Link -->
      <p class="text-center text-sm text-neutral-500 dark:text-neutral-400 mt-6">
        Don't have an account?
        <NuxtLink
          to="/auth/signup"
          class="text-primary-600 dark:text-primary-400 font-medium hover:underline"
        >
          Sign up
        </NuxtLink>
      </p>
    </UCard>
  </AuthLayout>
</template>
