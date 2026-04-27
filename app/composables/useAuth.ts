import type { ComputedRef } from 'vue'
import { useNeonClient, clearSessionCache } from './useNeonClient'

export interface User {
  id: string
  name: string | null
  email: string | null
  image: string | null
  avatar: string | null
  username: string | null
  bio: string | null
  isAnonymous: boolean
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isAnonymous: boolean
}

// Cookie key
const AUTH_COOKIE_KEY = 'tts_auth'

interface UseAuthReturn {
  user: ComputedRef<User | null>
  token: ComputedRef<string | null>
  isAuthenticated: ComputedRef<boolean>
  isAnonymous: ComputedRef<boolean>
  isLoading: ComputedRef<boolean>
  initAuth: () => void
  fetchSession: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (email: string, password: string, name?: string) => Promise<{ error?: string }>
  signInWithOAuth: (provider: 'google' | 'github') => Promise<void>
  signOut: () => Promise<void>
  linkAnonymousAccount: (email: string, password: string) => Promise<{ error?: string }>
  getAuthHeaders: () => Record<string, string>
  refreshUserProfile: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  // Use Nuxt's useCookie for SSR-compatible storage
  const authCookie = useCookie<{ token: string; user: User } | null>(AUTH_COOKIE_KEY, {
    maxAge: 60 * 60 * 24 * 30, // 30 days
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  // Computed values directly from the cookie - this ensures SSR consistency
  const user = computed(() => authCookie.value?.user ?? null)
  const token = computed(() => authCookie.value?.token ?? null)
  const isAuthenticated = computed(() => !!authCookie.value?.user)
  const isAnonymous = computed(() => authCookie.value?.user?.isAnonymous ?? false)
  // Never loading since cookie is available synchronously
  const isLoading = computed(() => false)

  // Store auth data in cookie
  function storeAuthData(newToken: string | null, newUser: User | null): void {
    if (newToken && newUser) {
      authCookie.value = { token: newToken, user: newUser }
    } else {
      authCookie.value = null
    }
  }

  // No-op for compatibility
  function initAuth(): void {}
  async function fetchSession(): Promise<void> {}

  // Get headers for authenticated API requests
  function getAuthHeaders(): Record<string, string> {
    const currentUser = authCookie.value?.user
    if (currentUser) {
      const tokenData = {
        id: currentUser.id,
        email: currentUser.email,
        name: currentUser.name,
        image: currentUser.image,
      }
      const encodedToken = btoa(JSON.stringify(tokenData))
      return { Authorization: `Bearer ${encodedToken}` }
    }
    return {}
  }

  // Fetch the user's profile to get username, avatar, name, bio
  async function fetchUserProfile(userId: string): Promise<{
    username: string | null
    avatar: string | null
    name: string | null
    bio: string | null
  }> {
    try {
      const response = await $fetch<{ user: {
        username: string | null
        avatar: string | null
        name: string | null
        bio: string | null
      } }>(
        `/api/users/${userId}/profile`
      )
      return {
        username: response.user?.username || null,
        avatar: response.user?.avatar || null,
        name: response.user?.name || null,
        bio: response.user?.bio || null,
      }
    } catch {
      return { username: null, avatar: null, name: null, bio: null }
    }
  }

  // Sign in with email/password
  async function signIn(email: string, password: string): Promise<{ error?: string }> {
    try {
      const client = await useNeonClient()
      const result = await client.auth.signIn.email({
        email,
        password,
      })

      const userData = result?.data?.user || result?.user
      const errorData = result?.error

      if (errorData) {
        return { error: typeof errorData === 'string' ? errorData : errorData.message || 'Sign in failed' }
      }

      if (userData) {
        const sessionToken = result?.data?.token || result?.token
        // Ensure user record exists in our database (might not if created via OAuth or Neon directly)
        await $fetch('/api/users/ensure', {
          method: 'POST',
          body: {
            id: userData.id,
            email: userData.email,
            name: userData.name,
          },
        }).catch(() => {})
        // Fetch profile from our database
        const profile = await fetchUserProfile(userData.id)
        const user: User = {
          id: userData.id,
          name: profile.name || userData.name || null,
          email: userData.email || null,
          image: userData.image || null,
          avatar: profile.avatar,
          username: profile.username,
          bio: profile.bio,
          isAnonymous: false,
        }
        storeAuthData(sessionToken || null, user)
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
      const client = await useNeonClient()
      const result = await client.auth.signUp.email({
        email,
        password,
        name: name || undefined,
      })

      const userData = result?.data?.user || result?.user
      const errorData = result?.error

      if (errorData) {
        return { error: typeof errorData === 'string' ? errorData : errorData.message || 'Sign up failed' }
      }

      if (userData) {
        const sessionToken = result?.data?.token || result?.token
        // Ensure user record exists in our database with username
        await $fetch('/api/users/ensure', {
          method: 'POST',
          body: {
            id: userData.id,
            email: userData.email,
            name: userData.name || name,
          },
        }).catch(() => {})
        // Fetch profile from our database
        const profile = await fetchUserProfile(userData.id)
        const user: User = {
          id: userData.id,
          name: profile.name || userData.name || null,
          email: userData.email || null,
          image: userData.image || null,
          avatar: profile.avatar,
          username: profile.username,
          bio: profile.bio,
          isAnonymous: false,
        }
        storeAuthData(sessionToken || null, user)
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
    const client = await useNeonClient()
    await client.auth.signIn.social({
      provider,
      callbackURL: '/',
    })
  }

  // Link anonymous account to email/password
  async function linkAnonymousAccount(email: string, password: string): Promise<{ error?: string }> {
    if (!isAnonymous.value) {
      return { error: 'Not an anonymous user' }
    }

    try {
      const client = await useNeonClient()
      const result = await client.auth.linkAccount.email({
        email,
        password,
      })

      const userData = result?.data?.user || result?.user
      const errorData = result?.error

      if (errorData) {
        return { error: typeof errorData === 'string' ? errorData : errorData.message || 'Failed to link account' }
      }

      if (userData) {
        // Ensure user record exists in our database with username
        await $fetch('/api/users/ensure', {
          method: 'POST',
          body: {
            id: userData.id,
            email: userData.email,
            name: userData.name,
          },
        }).catch(() => {})
        // Fetch profile from our database
        const profile = await fetchUserProfile(userData.id)
        const user: User = {
          id: userData.id,
          name: profile.name || userData.name || null,
          email: userData.email || null,
          image: userData.image || null,
          avatar: profile.avatar,
          username: profile.username,
          bio: profile.bio,
          isAnonymous: false,
        }
        storeAuthData(token.value, user)
        clearSessionCache()
        return {}
      }
      return { error: 'Failed to link account' }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to link account'
      return { error: message }
    }
  }

  // Refresh user profile to get latest data (username, avatar, name, bio)
  async function refreshUserProfile(): Promise<void> {
    const currentUser = authCookie.value?.user
    if (!currentUser) return

    try {
      const profile = await fetchUserProfile(currentUser.id)
      // Update all profile fields that might have changed
      storeAuthData(token.value, {
        ...currentUser,
        username: profile.username ?? currentUser.username,
        avatar: profile.avatar ?? currentUser.avatar,
        name: profile.name ?? currentUser.name,
        bio: profile.bio ?? currentUser.bio,
      })
    } catch {
      // Ignore errors
    }
  }

  // Sign out
  async function signOut(): Promise<void> {
    try {
      const client = await useNeonClient()
      await client.auth.signOut()
    } catch {
      // Ignore errors from SDK signOut
    } finally {
      storeAuthData(null, null)
      clearSessionCache()
    }
  }

  return {
    user,
    token,
    isAuthenticated,
    isAnonymous,
    isLoading,
    initAuth,
    fetchSession,
    signIn,
    signUp,
    signInWithOAuth,
    signOut,
    getAuthHeaders,
    linkAnonymousAccount,
    refreshUserProfile,
  }
}
