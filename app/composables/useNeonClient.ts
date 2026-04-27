// Session cache with 5-minute TTL
const SESSION_CACHE_TTL_MS = 5 * 60 * 1000

interface SessionCache {
  data: unknown
  expiresAt: number
}

let sessionCache: SessionCache | null = null

// Lazy-loaded neon-js modules to avoid server-side execution
// @neondatabase/neon-js does async I/O at module load which breaks Cloudflare Workers
let neonJsModule: typeof import('@neondatabase/neon-js') | null = null

async function loadNeonJs() {
  if (!neonJsModule) {
    neonJsModule = await import('@neondatabase/neon-js')
  }
  return neonJsModule
}

// Client type - use any to avoid import at top level
type NeonClient = Awaited<ReturnType<typeof import('@neondatabase/neon-js').createClient>>

let cachedClient: NeonClient | null = null

async function buildClient(authUrl: string, dataApiUrl: string): Promise<NeonClient> {
  const { createClient, BetterAuthVanillaAdapter } = await loadNeonJs()

  const adapter = BetterAuthVanillaAdapter({
    fetchOptions: {
      customFetchImpl: async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const urlString = url instanceof URL ? url.href : typeof url === 'string' ? url : url.url

        if (urlString.includes('/get-session')) {
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

        if (urlString.includes('/token/anonymous')) {
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

        return fetch(url, init)
      },
    },
  })

  return createClient({
    auth: { url: authUrl, allowAnonymous: true, adapter },
    dataApi: { url: dataApiUrl },
  })
}

export async function useNeonClient(): Promise<NeonClient> {
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

  cachedClient = await buildClient(authUrl, dataApiUrl)
  return cachedClient
}

export function clearSessionCache(): void {
  sessionCache = null
}
