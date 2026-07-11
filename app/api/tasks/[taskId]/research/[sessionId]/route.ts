import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, query, queryOne } from '@/lib/db'
import { ensureAITables } from '@/lib/migrate'

// GET — Fetch a specific research session
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string; sessionId: string }> }
) {
  const { taskId, sessionId } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureAITables()

  const session = await queryOne(
    `SELECT rs.id, rs.task_id, rs.context_json, rs.result_json,
            rs.model_used, rs.duration_ms, rs.created_by, rs.created_at
     FROM research_sessions rs
     JOIN tasks t ON t.id = rs.task_id
     LEFT JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = $3
     WHERE rs.id = $1 AND rs.task_id = $2
       AND (pm.role IS NOT NULL OR $4 = 'admin')`,
    [sessionId, taskId, user.userId, user.role]
  )

  if (!session) {
    return NextResponse.json({ error: 'Research session not found' }, { status: 404 })
  }

  return NextResponse.json({ session })
}

// DELETE — Remove a research session
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string; sessionId: string }> }
) {
  const { taskId, sessionId } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureAITables()

  // Verify ownership or admin
  const session = await queryOne<{ created_by: string }>(
    `SELECT rs.created_by FROM research_sessions rs
     JOIN tasks t ON t.id = rs.task_id
     LEFT JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = $3
     WHERE rs.id = $1 AND rs.task_id = $2
       AND (pm.role IS NOT NULL OR $4 = 'admin')`,
    [sessionId, taskId, user.userId, user.role]
  )

  if (!session) {
    return NextResponse.json({ error: 'Research session not found' }, { status: 404 })
  }

  if (session.created_by !== user.userId && user.role !== 'admin') {
    return NextResponse.json({ error: 'Only the creator or an admin can delete this session' }, { status: 403 })
  }

  await query('DELETE FROM research_sessions WHERE id = $1', [sessionId])
  return NextResponse.json({ message: 'Research session deleted' })
}
