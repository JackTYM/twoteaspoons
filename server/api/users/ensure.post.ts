import { eq } from 'drizzle-orm'
import { db, users } from '../../db'
import { getUniqueUsername } from '../../utils/slug'

interface EnsureUserBody {
  id: string
  email: string
  name?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<EnsureUserBody>(event)

  if (!body.id || !body.email) {
    throw createError({
      statusCode: 400,
      message: 'User ID and email are required',
    })
  }

  // Check if user already exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.id, body.id),
  })

  if (existingUser) {
    // User exists, return their info
    return { user: existingUser, created: false }
  }

  // Create new user with generated username
  const emailPrefix = body.email.split('@')[0]
  const displayName = body.name || emailPrefix || 'User'
  const username = await getUniqueUsername(displayName)

  const [newUser] = await db
    .insert(users)
    .values({
      id: body.id,
      email: body.email,
      name: displayName,
      username: username,
    })
    .returning()

  return { user: newUser, created: true }
})
