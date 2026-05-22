import { drizzle } from 'drizzle-orm/neon-http'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

// Type for the drizzle instance
type DrizzleDB = NeonHttpDatabase<typeof schema>

// Lazy initialization for Cloudflare Workers compatibility.
// Importing neon/drizzle at module scope is safe (no I/O on import); only the
// neon()/drizzle() *calls* must be deferred, since Workers disallow async I/O
// in global scope. Those calls happen here, on first DB access.
let _db: DrizzleDB | null = null

function getDb(): DrizzleDB {
  if (!_db) {
    const sql = neon(process.env.DATABASE_URL!)
    _db = drizzle(sql, { schema }) as DrizzleDB
  }
  return _db
}

// Export a proxy that lazily initializes on first access
export const db = new Proxy({} as DrizzleDB, {
  get(_, prop) {
    return getDb()[prop as keyof DrizzleDB]
  },
})

// Export schema for use in queries
export * from './schema'
