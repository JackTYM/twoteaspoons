import type { ComputedRef } from 'vue'
import { useNeonClient, clearSessionCache } from './useNeonClient'

export interface User {
  id: string
  name: string | null
  email: string | null
  image: string | null
  isAnonymous: boolean
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isAnonymous: boolean
  isLoading: boolean
}

// Global state shared across components
const authState = reactive<AuthState>({
  user: null,
  isAuthenticated: false,
  isAnonymous: false,
  isLoading: true,
})

interface UseAuthReturn {
  user: ComputedRef<User | null>
  isAuthenticated: ComputedRef<boolean>
  isAnonymous: ComputedRef<boolean>
  isLoading: ComputedRef<boolean>
  fetchSession: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (email: string, password: string, name?: string) => Promise<{ error?: string }>
  signInWithOAuth: (provider: 'google' | 'github') => Promise<void>
  signOut: () => Promise<void>
  linkAnonymousAccount: (email: string, password: string) => Promise<{ error?: string }>
}

export function useAuth(): UseAuthReturn {
  const user = computed(() => authState.user)
  const isAuthenticated = computed(() => authState.isAuthenticated)
  const isAnonymous = computed(() => authState.isAnonymous)
  const isLoading = computed(() => authState.isLoading)

  // Fetch current session (works for both anonymous and authenticated)
  async function fetchSession(): Promise<void> {
    authState.isLoading = true
    try {
      const client = useNeonClient()
      const session = await client.auth.getSession()

      if (session?.user) {
        authState.user = {
          id: session.user.id,
          name: session.user.name || null,
          email: session.user.email || null,
          image: session.user.image || null,
          isAnonymous: session.user.isAnonymous ?? false,
        }
        authState.isAuthenticated = true
        authState.isAnonymous = session.user.isAnonymous ?? false
      } else {
        // Get anonymous session
        const anonSession = await client.auth.signIn.anonymous()
        if (anonSession?.user) {
          authState.user = {
            id: anonSession.user.id,
            name: null,
            email: null,
            image: null,
            isAnonymous: true,
          }
          authState.isAuthenticated = true
          authState.isAnonymous = true
        }
      }
    } catch (error) {
      console.error('Failed to fetch session:', error)
      authState.user = null
      authState.isAuthenticated = false
      authState.isAnonymous = false
    } finally {
      authState.isLoading = false
    }
  }

  // Sign in with email/password
  async function signIn(email: string, password: string): Promise<{ error?: string }> {
    try {
      const client = useNeonClient()
      const result = await client.auth.signIn.email({
        email,
        password,
      })

      if (result?.user) {
        authState.user = {
          id: result.user.id,
          name: result.user.name || null,
          email: result.user.email || null,
          image: result.user.image || null,
          isAnonymous: false,
        }
        authState.isAuthenticated = true
        authState.isAnonymous = false
        clearSessionCache()
        return {}
      }
      return { error: 'Sign in failed' }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign in failed'
      return { error: message }
    }
  }

  // Sign up with email/password
  async function signUp(email: string, password: string, name?: string): Promise<{ error?: string }> {
    try {
      const client = useNeonClient()
      const result = await client.auth.signUp.email({
        email,
        password,
        name: name || undefined,
      })

      if (result?.user) {
        authState.user = {
          id: result.user.id,
          name: result.user.name || null,
          email: result.user.email || null,
          image: result.user.image || null,
          isAnonymous: false,
        }
        authState.isAuthenticated = true
        authState.isAnonymous = false
        clearSessionCache()
        return {}
      }
      return { error: 'Sign up failed' }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign up failed'
      return { error: message }
    }
  }

  // Sign in with OAuth provider
  async function signInWithOAuth(provider: 'google' | 'github'): Promise<void> {
    const client = useNeonClient()
    await client.auth.signIn.oauth({
      provider,
      callbackURL: '/recipes',
    })
  }

  // Link anonymous account to email/password
  async function linkAnonymousAccount(email: string, password: string): Promise<{ error?: string }> {
    if (!authState.isAnonymous) {
      return { error: 'Not an anonymous user' }
    }

    try {
      const client = useNeonClient()
      // Use the link account method to upgrade anonymous to full account
      const result = await client.auth.linkAccount.email({
        email,
        password,
      })

      if (result?.user) {
        authState.user = {
          id: result.user.id,
          name: result.user.name || null,
          email: result.user.email || null,
          image: result.user.image || null,
          isAnonymous: false,
        }
        authState.isAnonymous = false
        clearSessionCache()
        return {}
      }
      return { error: 'Failed to link account' }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to link account'
      return { error: message }
    }
  }

  // Sign out
  async function signOut(): Promise<void> {
    try {
      const client = useNeonClient()
      await client.auth.signOut()
    } finally {
      clearSessionCache()
      // After sign out, get a new anonymous session
      await fetchSession()
    }
  }

  return {
    user,
    isAuthenticated,
    isAnonymous,
    isLoading,
    fetchSession,
    signIn,
    signUp,
    signInWithOAuth,
    signOut,
    linkAnonymousAccount,
  }
}
