import { NextResponse } from 'next/server'
import { getCurrentUser, query, DEFAULT_ORG_ID } from '@/lib/db'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const users = await query(
    `SELECT id, email, display_name, created_at FROM users WHERE org_id = $1 ORDER BY display_name ASC`,
    [DEFAULT_ORG_ID]
  )

  return NextResponse.json({ users, count: users.length })
}
