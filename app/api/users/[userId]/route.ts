import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, query, queryOne, DEFAULT_ORG_ID } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const authedUser = await getCurrentUser()
  if (!authedUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await queryOne(
    `SELECT id, email, display_name, role, status, created_at
     FROM users WHERE id = $1 AND org_id = $2`,
    [userId, DEFAULT_ORG_ID]
  )
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const tasks = await query(
    `SELECT t.id, t.title, t.status, t.project_id, p.name AS project_name
     FROM tasks t JOIN projects p ON p.id = t.project_id
     WHERE t.assignee_id = $1
     ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC
     LIMIT 10`,
    [userId]
  )

  const projects = await query(
    `SELECT p.id, p.name, p.status, pm.role
     FROM project_members pm JOIN projects p ON p.id = pm.project_id
     WHERE pm.user_id = $1
     ORDER BY p.created_at DESC`,
    [userId]
  )

  return NextResponse.json({ user, tasks, projects })
}
