import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, queryOne, DEFAULT_ORG_ID } from '@/lib/db'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isAdmin = user.role === 'admin'

  const projects = await queryOne<{ count: number }>(
    'SELECT COUNT(*)::int AS count FROM projects WHERE org_id = $1',
    [DEFAULT_ORG_ID]
  )

  const tasks = await queryOne<{ count: number }>(
    `SELECT COUNT(t.*)::int AS count FROM tasks t JOIN projects p ON p.id = t.project_id WHERE p.org_id = $1`,
    [DEFAULT_ORG_ID]
  )

  const doneTasks = await queryOne<{ count: number }>(
    `SELECT COUNT(t.*)::int AS count FROM tasks t JOIN projects p ON p.id = t.project_id WHERE p.org_id = $1 AND t.status = 'done'`,
    [DEFAULT_ORG_ID]
  )

  const users = await queryOne<{ count: number }>(
    'SELECT COUNT(*)::int AS count FROM users WHERE org_id = $1',
    [DEFAULT_ORG_ID]
  )

  // Non-admins receive the same surface today; can be restricted later.
  return NextResponse.json({
    projects: projects?.count ?? 0,
    tasks: tasks?.count ?? 0,
    doneTasks: doneTasks?.count ?? 0,
    users: users?.count ?? 0,
    isAdmin,
  })
}
