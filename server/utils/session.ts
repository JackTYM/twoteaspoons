import type { H3Event } from 'h3'

export interface AuthUser {
  id: string
  email: string
  name: string
  avatar?: string
}

interface BetterAuthSession {
  session: {
    id: string
    userId: string
    expiresAt: string
  }
  user: {
    id: string
    email: string
    name?: string
    image?: string
  }
}

/**
 * Get the authenticated user from the request.
 * Verifies the session by calling the auth service.
 * Returns null if not authenticated.
 */
export async function getAuthUser(event: H3Event): Promise<AuthUser | null> {
  try {
    // Get cookie header from request
    const cookieHeader = getHeader(event, 'cookie')

    if (!cookieHeader) {
      return null
    }

    // Call the auth service to get session
    const authUrl = process.env.NEON_AUTH_URL
    if (!authUrl) {
      console.error('NEON_AUTH_URL not configured')
      return null
    }

    const response = await fetch(`${authUrl}/api/auth/get-session`, {
      method: 'GET',
      headers: {
        'Cookie': cookieHeader,
      },
      credentials: 'include',
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json() as BetterAuthSession | null

    if (!data?.user) {
      return null
    }

    return {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name || data.user.email.split('@')[0] || 'User',
      avatar: data.user.image,
    }
  } catch (err) {
    console.error('Session verification failed:', err)
    return null
  }
}

/**
 * Require authentication. Throws 401 if not authenticated.
 */
export async function requireAuth(event: H3Event): Promise<AuthUser> {
  const user = await getAuthUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required',
    })
  }

  return user
}
