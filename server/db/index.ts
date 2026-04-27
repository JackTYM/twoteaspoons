import { drizzle } from 'drizzle-orm/neon-http'
import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import * as schema from './schema'

// Lazy initialization for Cloudflare Workers compatibility
// Workers don't allow async I/O in global scope
let _sql: NeonQueryFunction<false, false> | null = null
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null

function getDb() {
  if (!_db) {
    _sql = neon(process.env.DATABASE_URL!)
    _db = drizzle(_sql, { schema })
  }
  return _db
}

// Export a proxy that lazily initializes on first access
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop) {
    return getDb()[prop as keyof typeof _db]
  },
})

// Export schema for use in queries
export * from './schema'
