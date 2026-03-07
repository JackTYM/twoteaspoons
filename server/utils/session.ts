import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { db, users } from '../db'

export interface AuthUser {
  id: string
  email: string
  name: string
  username: string | null
  avatar?: string
}

/**
 * Get the authenticated user from the request.
 * Parses the user data from the Authorization header.
 *
 * Token format: base64({ userId, email, name })
 *
 * Note: This is a simplified auth for development.
 * In production, this should verify with Neon Auth or use signed JWTs.
 */
export async function getAuthUser(event: H3Event): Promise<AuthUser | null> {
  try {
    // Get Authorization header (Bearer token) from request
    const authHeader = getHeader(event, 'authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    // Decode the token (base64 JSON with user data)
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8')
      const userData = JSON.parse(decoded)

      if (!userData.id) {
        return null
      }

      // Fetch username from database
      const dbUser = await db.query.users.findFirst({
        where: eq(users.id, userData.id),
        columns: { username: true },
      })

      return {
        id: userData.id,
        email: userData.email || '',
        name: userData.name || 'User',
        username: dbUser?.username || null,
        avatar: userData.image,
      }
    } catch {
      // Token isn't base64 JSON - might be a session token
      // For now, return null (not authenticated)
      console.error('[Auth] Invalid token format')
      return null
    }
  } catch (err) {
    console.error('Auth failed:', err)
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
