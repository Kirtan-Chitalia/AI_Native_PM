// ─── GET /api/projects/[id]/ai-tasks/history ─────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, query, queryOne } from '@/lib/db'
import { ensureAITables } from '@/lib/migrate'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  await ensureAITables()
  const { id: projectId } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await queryOne<{ role: string }>(
    'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
    [projectId, user.userId],
  )
  if (!membership && user.role !== 'admin') {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const history = await query(
    `SELECT atg.id, atg.version, atg.model_used, atg.duration_ms,
            atg.created_at, atg.prd_version_id,
            u.display_name AS created_by_name,
            jsonb_array_length(atg.tasks_json) AS task_count
     FROM ai_task_generations atg
     LEFT JOIN users u ON u.id = atg.created_by
     WHERE atg.project_id = $1
     ORDER BY atg.version DESC`,
    [projectId],
  )

  return NextResponse.json({ history })
}
