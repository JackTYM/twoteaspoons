import { drizzle } from 'drizzle-orm/neon-serverless'
import { Pool, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'
import * as schema from './schema'

// Configure WebSocket for Node.js environment
neonConfig.webSocketConstructor = ws

// Create connection pool
const pool = new Pool({ connectionString: process.env.DATABASE_URL! })

// Export Drizzle instance with schema
export const db = drizzle(pool, { schema })

// Export schema for use in queries
export * from './schema'
