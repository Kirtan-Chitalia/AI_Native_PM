// ─── GET /api/projects/[id]/prd/history — PRD version list ───────────────────

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

  const versions = await query(
    `SELECT pv.id, pv.version, pv.is_current, pv.created_at,
            u.display_name AS created_by_name,
            LENGTH(pv.content) AS char_count
     FROM prd_versions pv
     LEFT JOIN users u ON u.id = pv.created_by
     WHERE pv.project_id = $1
     ORDER BY pv.version DESC`,
    [projectId],
  )

  return NextResponse.json({ versions })
}
