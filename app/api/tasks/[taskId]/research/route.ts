import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, query, queryOne } from '@/lib/db'
import { ensureAITables } from '@/lib/migrate'
import { getTaskContext } from '@/services/context-service'
import { generateResearch } from '@/agents/research-agent/service'

// POST — Generate new research for a task
export async function POST(req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureAITables()

  // Verify task exists and user has access
  const taskAccess = await queryOne<{ project_id: string; role: string | null }>(
    `SELECT t.project_id, pm.role
     FROM tasks t
     LEFT JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = $2
     WHERE t.id = $1`,
    [taskId, user.userId]
  )
  if (!taskAccess || (!taskAccess.role && user.role !== 'admin')) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  try {
    // 1. Gather context
    const context = await getTaskContext(taskId)

    // 2. Generate research
    const result = await generateResearch(context)

    // 3. Persist the session
    const session = await queryOne(
      `INSERT INTO research_sessions (task_id, context_json, result_json, model_used, duration_ms, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, task_id, result_json, model_used, duration_ms, created_by, created_at`,
      [taskId, JSON.stringify(context), JSON.stringify(result.data), result.model, result.durationMs, user.userId]
    )

    return NextResponse.json({ session, research: result.data }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Research generation failed'
    console.error('[research-agent]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET — List research history for a task
export async function GET(req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureAITables()

  const taskAccess = await queryOne<{ project_id: string; role: string | null }>(
    `SELECT t.project_id, pm.role
     FROM tasks t
     LEFT JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = $2
     WHERE t.id = $1`,
    [taskId, user.userId]
  )
  if (!taskAccess || (!taskAccess.role && user.role !== 'admin')) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  const sessions = await query(
    `SELECT id, task_id, result_json, model_used, duration_ms, created_by, created_at
     FROM research_sessions
     WHERE task_id = $1
     ORDER BY created_at DESC
     LIMIT 20`,
    [taskId]
  )

  return NextResponse.json({ sessions })
}
