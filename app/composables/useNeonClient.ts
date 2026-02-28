import { createClient, BetterAuthVanillaAdapter } from '@neondatabase/neon-js'

// Session cache with 5-minute TTL
const SESSION_CACHE_TTL_MS = 5 * 60 * 1000

interface SessionCache {
  data: unknown
  expiresAt: number
}

let sessionCache: SessionCache | null = null

const buildClient = (authUrl: string, dataApiUrl: string): ReturnType<typeof createClient> => {
  // Create adapter with custom fetch options to intercept session calls
  const adapter = BetterAuthVanillaAdapter({
    fetchOptions: {
      customFetchImpl: async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const urlString = url instanceof URL ? url.href : typeof url === 'string' ? url : url.url

        // Intercept session endpoint calls
        if (urlString.includes('/get-session')) {
          // Check if we have a valid cached session
          if (sessionCache && Date.now() < sessionCache.expiresAt) {
            // Return cached response
            return new Response(JSON.stringify(sessionCache.data), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          // Fetch fresh session
          const response = await fetch(url, init)

          if (response.ok) {
            const clonedResponse = response.clone()
            const data: unknown = await clonedResponse.json()

            // Cache the session data
            sessionCache = {
              data,
              expiresAt: Date.now() + SESSION_CACHE_TTL_MS,
            }
          }

          return response
        }

        // Intercept anonymous token endpoint
        if (urlString.includes('/token/anonymous')) {
          // Check if we have a valid cached session
          if (sessionCache && Date.now() < sessionCache.expiresAt) {
            return new Response(JSON.stringify(sessionCache.data), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          const response = await fetch(url, init)

          if (response.ok) {
            const clonedResponse = response.clone()
            const data: unknown = await clonedResponse.json()

            sessionCache = {
              data,
              expiresAt: Date.now() + SESSION_CACHE_TTL_MS,
            }
          }

          return response
        }

        // Default fetch for all other requests
        return fetch(url, init)
      },
    },
  })

  return createClient({
    auth: { url: authUrl, allowAnonymous: true, adapter },
    dataApi: { url: dataApiUrl },
  })
}

let cachedClient: ReturnType<typeof createClient> | null = null

export function useNeonClient(): ReturnType<typeof createClient> {
  if (cachedClient) return cachedClient

  const config = useRuntimeConfig()
  const authUrl = config.public.neonAuthUrl as string
  const dataApiUrl = config.public.neonDataApiUrl as string

  if (!authUrl) {
    throw new Error('Missing runtimeConfig.public.neonAuthUrl')
  }
  if (!dataApiUrl) {
    throw new Error('Missing runtimeConfig.public.neonDataApiUrl')
  }

  const client = buildClient(authUrl, dataApiUrl)

  cachedClient = client
  return client
}

// Export function to clear session cache (for logout)
export function clearSessionCache(): void {
  sessionCache = null
}
