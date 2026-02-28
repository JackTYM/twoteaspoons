import { createAuthClient } from '@neondatabase/auth'

// Server-side auth client
export const authClient = createAuthClient(process.env.NEON_AUTH_URL!)
