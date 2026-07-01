import { Pool } from 'pg'
import { getAuthToken, verifyToken } from '@/lib/auth'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function query(text: string, params?: unknown[]) {
  const result = await pool.query(text, params)
  return result.rows
}

export async function queryOne<T = Record<string, unknown>>(text: string, params?: unknown[]) {
  const rows = await query(text, params)
  return (rows[0] as T) ?? null
}

export const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001'

// Auth is currently backed by an in-memory store (lib/store.ts), not this
// database, so a logged-in user may not have a row here yet. Upsert one
// on first touch so project/task foreign keys resolve.
export async function ensureUserAndOrg(userId: string, email: string) {
  await query(
    `INSERT INTO organizations (id, name, slug)
     VALUES ($1, 'Default Organization', 'default')
     ON CONFLICT (id) DO NOTHING`,
    [DEFAULT_ORG_ID]
  )
  await query(
    `INSERT INTO users (id, org_id, email, email_verified, display_name)
     VALUES ($1, $2, $3, TRUE, $4)
     ON CONFLICT (id) DO NOTHING`,
    [userId, DEFAULT_ORG_ID, email, email.split('@')[0]]
  )
}

export async function getCurrentUser() {
  const token = await getAuthToken()
  if (!token) return null
  const payload = verifyToken(token)
  if (!payload) return null
  await ensureUserAndOrg(payload.userId, payload.email)
  return payload
}
