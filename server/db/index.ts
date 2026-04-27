import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import * as schema from './schema'

// Type for the drizzle instance
type DrizzleDB = NeonHttpDatabase<typeof schema>

// Lazy initialization for Cloudflare Workers compatibility
// Workers don't allow async I/O in global scope - neon() triggers fetch internally
let _db: DrizzleDB | null = null

function getDb(): DrizzleDB {
  if (!_db) {
    // Dynamic require to avoid top-level module evaluation
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { drizzle } = require('drizzle-orm/neon-http')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { neon } = require('@neondatabase/serverless')
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
