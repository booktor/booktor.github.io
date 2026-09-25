import 'server-only'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const globalForDb = globalThis as unknown as { booktorPool?: Pool }

const pool =
  globalForDb.booktorPool ??
  new Pool({ connectionString: process.env.DATABASE_URL, max: 5 })

if (process.env.NODE_ENV !== 'production') globalForDb.booktorPool = pool

export const db = drizzle(pool, { schema })
