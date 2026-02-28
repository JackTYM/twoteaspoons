import type { ComputedRef } from 'vue'

export interface User {
  id: string
  name: string | null
  email: string
  emailVerified: boolean
  createdAt: string
  updatedAt: string
}

export interface Session {
  user: User
  session: {
    id: string
    expiresAt: string
    token: string
    userId: string
  }
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

// Global state shared across components
const authState = reactive<AuthState>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
})

interface UseAuthReturn {
  user: ComputedRef<User | null>
  isAuthenticated: ComputedRef<boolean>
  isLoading: ComputedRef<boolean>
  fetchSession: () => Promise<void>
  signUp: (email: string, password: string, name?: string) => Promise<{ user?: User; error?: string }>
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signInWithSocial: (provider: 'google' | 'github', callbackURL?: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const user = computed(() => authState.user)
  const isAuthenticated = computed(() => authState.isAuthenticated)
  const isLoading = computed(() => authState.isLoading)

  // Fetch current session
  async function fetchSession(): Promise<void> {
    authState.isLoading = true
    try {
      const { session } = await $fetch<{ session: Session | null }>('/api/auth/session')
      if (session?.user) {
        authState.user = session.user
        authState.isAuthenticated = true
      } else {
        authState.user = null
        authState.isAuthenticated = false
      }
    } catch {
      authState.user = null
      authState.isAuthenticated = false
    } finally {
      authState.isLoading = false
    }
  }

  // Sign up with email/password
  async function signUp(email: string, password: string, name?: string): Promise<{ user?: User; error?: string }> {
    try {
      const result = await $fetch<{ user: User }>('/api/auth/signup', {
        method: 'POST',
        body: { email, password, name },
      })
      await fetchSession()
      return { user: result.user }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Sign up failed'
      return { error: message }
    }
  }

  // Sign in with email/password
  async function signIn(email: string, password: string): Promise<{ error?: string }> {
    try {
      await $fetch('/api/auth/signin', {
        method: 'POST',
        body: { email, password },
      })
      await fetchSession()
      return {}
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Sign in failed'
      return { error: message }
    }
  }

  // Sign in with social provider
  async function signInWithSocial(provider: 'google' | 'github', callbackURL?: string): Promise<{ error?: string }> {
    try {
      const result = await $fetch<{ data: { url?: string } }>('/api/auth/social', {
        method: 'POST',
        body: { provider, callbackURL },
      })
      // Social auth typically redirects to provider
      if (result.data?.url) {
        window.location.href = result.data.url
      }
      return {}
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Social sign in failed'
      return { error: message }
    }
  }

  // Sign out
  async function signOut(): Promise<void> {
    try {
      await $fetch('/api/auth/signout', { method: 'POST' })
    } finally {
      authState.user = null
      authState.isAuthenticated = false
    }
  }

  return {
    user,
    isAuthenticated,
    isLoading,
    fetchSession,
    signUp,
    signIn,
    signInWithSocial,
    signOut,
  }
}
