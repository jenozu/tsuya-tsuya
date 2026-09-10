import { neon } from '@neondatabase/serverless'

let sqlClient: ReturnType<typeof neon> | null = null
let currentUrl: string | null = null

export function getDb(): ReturnType<typeof neon> {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('DATABASE_URL is not configured')

  if (!sqlClient || currentUrl !== databaseUrl) {
    sqlClient = neon(databaseUrl)
    currentUrl = databaseUrl
  }

  return sqlClient
}
