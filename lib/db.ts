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

// Org-level admins are configured via env var rather than a management UI —
// this app has no separate "make someone admin" flow yet. Role is
// re-derived from this list on every login, so editing the env var and
// restarting takes effect immediately (including demotions).
// admin@eccouncil.org is the DEMO-ONLY hardcoded superadmin (see lib/store.ts)
// and always resolves to admin regardless of ADMIN_EMAILS.
const ADMIN_EMAILS = [
  'admin@eccouncil.org',
  ...(process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean),
]

// Auth is now backed by Postgres. 
// ensureUserAndOrg still ensures the org exists and creates the user stub if they login via OAuth or similar in the future.
export async function ensureUserAndOrg(userId: string, email: string) {
  await query(
    `INSERT INTO organizations (id, name, slug)
     VALUES ($1, 'Default Organization', 'default')
     ON CONFLICT (id) DO NOTHING`,
    [DEFAULT_ORG_ID]
  )
  const role = ADMIN_EMAILS.includes(email.toLowerCase()) ? 'admin' : 'user'
  
  const row = await queryOne<{ role: string; profile_role: string; must_change_password: boolean }>(
    `INSERT INTO users (id, org_id, email, email_verified, display_name, role)
     VALUES ($1, $2, $3, TRUE, $4, $5)
     ON CONFLICT (org_id, email) DO UPDATE SET display_name = EXCLUDED.display_name, role = EXCLUDED.role
     RETURNING role, profile_role, must_change_password`,
    [userId, DEFAULT_ORG_ID, email, email.split('@')[0], role]
  )
  return { 
    role: row!.role, 
    profileRole: row!.profile_role,
    mustChangePassword: row!.must_change_password
  }
}

export async function getUserByEmail(email: string) {
  const row = await queryOne<any>(
    `SELECT * FROM users WHERE email = $1`,
    [email.toLowerCase()]
  )
  if (!row) return null
  
  // If they are an admin via env var, override their org role
  const orgRole = ADMIN_EMAILS.includes(row.email) ? 'admin' : row.role
  
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    verified: row.email_verified,
    createdAt: row.created_at,
    role: orgRole,
    profileRole: row.profile_role,
    mustChangePassword: row.must_change_password,
    totpEnabled: row.totp_enabled,
  }
}

export async function updateUserPassword(userId: string, newHash: string) {
  await query(
    `UPDATE users SET password_hash = $1, must_change_password = FALSE WHERE id = $2`,
    [newHash, userId]
  )
}

export async function createDbUser(userId: string, email: string, passwordHash: string, profileRole: string, mustChangePassword: boolean) {
  await query(
    `INSERT INTO organizations (id, name, slug)
     VALUES ($1, 'Default Organization', 'default')
     ON CONFLICT (id) DO NOTHING`,
    [DEFAULT_ORG_ID]
  )
  const role = ADMIN_EMAILS.includes(email.toLowerCase()) ? 'admin' : 'user'
  
  await query(
    `INSERT INTO users (id, org_id, email, email_verified, display_name, role, password_hash, profile_role, must_change_password)
     VALUES ($1, $2, $3, TRUE, $4, $5, $6, $7, $8)
     ON CONFLICT (org_id, email) DO UPDATE SET 
        password_hash = EXCLUDED.password_hash,
        profile_role = EXCLUDED.profile_role,
        must_change_password = EXCLUDED.must_change_password,
        role = EXCLUDED.role`,
    [userId, DEFAULT_ORG_ID, email, email.split('@')[0], role, passwordHash, profileRole, mustChangePassword]
  )
}

export async function getUserTotpStatus(userId: string, email: string) {
  await ensureUserAndOrg(userId, email)
  const row = await queryOne<{ totp_enabled: boolean }>('SELECT totp_enabled FROM users WHERE id = $1', [userId])
  return row?.totp_enabled ?? false
}

export async function getCurrentUser() {
  const token = await getAuthToken()
  if (!token) return null
  const payload = verifyToken(token)
  if (!payload) return null
  const { role, profileRole, mustChangePassword } = await ensureUserAndOrg(payload.userId, payload.email)
  return { ...payload, role, profileRole, mustChangePassword }
}
