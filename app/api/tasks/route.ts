import { NextResponse } from 'next/server'
import { getCurrentUser, query } from '@/lib/db'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tasks = await query(
    `SELECT t.id, t.title, t.status, t.priority, t.story_points, t.due_date, t.project_id,
            p.name AS project_name
     FROM tasks t
     JOIN projects p ON p.id = t.project_id
     WHERE t.assignee_id = $1
     ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC
     LIMIT 50`,
    [user.userId]
  )

  return NextResponse.json({ tasks })
}
