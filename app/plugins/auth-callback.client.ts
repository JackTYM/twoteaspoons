// Client-side plugin to handle OAuth callback
import { useNeonClient, clearSessionCache } from '~/composables/useNeonClient'

export default defineNuxtPlugin(async () => {
  // Only run on client
  if (import.meta.server) return

  // Check for verifier in URL
  const urlParams = new URLSearchParams(window.location.search)
  const verifier = urlParams.get('neon_auth_session_verifier')

  if (!verifier) return

  console.log('[Auth] Processing OAuth callback with verifier:', verifier.substring(0, 10) + '...')

  // Process the OAuth callback
  try {
    const client = useNeonClient()

    // Get the session - the Neon client should automatically process the verifier
    // when we call getSession with the verifier in the URL
    const session = await client.auth.getSession()

    console.log('[Auth] Session response:', session)

    if (session?.data?.user || session?.user) {
      const userData = session?.data?.user || session?.user
      const tokenData = session?.data?.session?.token || session?.token || ''

      // Ensure user exists in our database
      await $fetch('/api/users/ensure', {
        method: 'POST',
        body: {
          id: userData.id,
          email: userData.email,
          name: userData.name,
        },
      }).catch((err) => {
        console.warn('[Auth] Failed to ensure user:', err)
      })

      // Fetch username from our database
      let username: string | null = null
      try {
        const profile = await $fetch<{ user: { username: string | null } }>(
          `/api/users/${userData.id}/profile`
        )
        username = profile.user?.username || null
      } catch {
        console.warn('[Auth] Failed to fetch user profile')
      }

      // Store in our auth cookie
      const authCookie = useCookie<{ token: string; user: { id: string; name: string | null; email: string | null; image: string | null; username: string | null; isAnonymous: boolean } } | null>('tts_auth', {
        maxAge: 60 * 60 * 24 * 30,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      })

      authCookie.value = {
        token: tokenData,
        user: {
          id: userData.id,
          name: userData.name || null,
          email: userData.email || null,
          image: userData.image || null,
          username,
          isAnonymous: false,
        },
      }

      console.log('[Auth] Stored user in cookie:', userData.email, 'username:', username)
      clearSessionCache()

      // Remove the verifier from URL and reload
      const url = new URL(window.location.href)
      url.searchParams.delete('neon_auth_session_verifier')
      window.history.replaceState({}, '', url.toString())
      window.location.reload()
    } else {
      console.error('[Auth] No user in session response:', session)
    }
  } catch (error) {
    console.error('[Auth] OAuth callback error:', error)
  }
})
