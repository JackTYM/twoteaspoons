<script setup lang="ts">
useSeoMeta({
  title: 'Sign In',
  description: 'Sign in to your TwoTeaspoons account',
})

const { signIn, signInWithSocial, isAuthenticated } = useAuth()

const form = reactive({
  email: '',
  password: '',
})
const error = ref('')
const loading = ref(false)

// Redirect if already authenticated
watch(isAuthenticated, (authenticated) => {
  if (authenticated) {
    navigateTo('/recipes')
  }
}, { immediate: true })

async function handleSubmit(): Promise<void> {
  error.value = ''
  loading.value = true

  const result = await signIn(form.email, form.password)

  if (result.error) {
    error.value = result.error
  } else {
    navigateTo('/recipes')
  }

  loading.value = false
}

async function handleGoogleSignIn(): Promise<void> {
  await signInWithSocial('google', '/recipes')
}
</script>

<template>
  <div class="min-h-[80vh] flex items-center justify-center px-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-neutral-700 dark:text-neutral-50 mb-2">
          Welcome back
        </h1>
        <p class="text-neutral-500 dark:text-neutral-400">
          Sign in to access your recipes
        </p>
      </div>

      <UCard class="bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700">
        <form
          class="space-y-4"
          @submit.prevent="handleSubmit"
        >
          <UAlert
            v-if="error"
            color="error"
            variant="soft"
            :title="error"
            icon="i-heroicons-exclamation-circle"
          />

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
            />
          </UFormField>

          <UFormField
            label="Password"
            name="password"
          >
            <UInput
              v-model="form.password"
              type="password"
              placeholder="Enter your password"
              icon="i-heroicons-lock-closed"
              required
            />
          </UFormField>

          <UButton
            type="submit"
            color="primary"
            block
            :loading="loading"
          >
            Sign in
          </UButton>
        </form>

        <UDivider
          label="or"
          class="my-6"
        />

        <UButton
          color="neutral"
          variant="outline"
          block
          icon="i-simple-icons-google"
          @click="handleGoogleSignIn"
        >
          Continue with Google
        </UButton>

        <p class="text-center text-sm text-neutral-500 dark:text-neutral-400 mt-6">
          Don't have an account?
          <NuxtLink
            to="/auth/signup"
            class="text-primary-600 dark:text-primary-400 hover:underline"
          >
            Sign up
          </NuxtLink>
        </p>
      </UCard>
    </div>
  </div>
</template>
