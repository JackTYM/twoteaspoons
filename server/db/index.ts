import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

// Use HTTP driver for Cloudflare Workers compatibility
// This uses fetch-based connections instead of WebSocket Pool
const sql = neon(process.env.DATABASE_URL!)

// Export Drizzle instance with schema
export const db = drizzle(sql, { schema })

// Export schema for use in queries
export * from './schema'
