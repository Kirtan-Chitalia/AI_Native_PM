import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, query, queryOne } from '@/lib/db'
import { ensureAITables } from '@/lib/migrate'

async function getMembership(projectId: string, userId: string) {
  return queryOne<{ role: string }>(
    'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
    [projectId, userId]
  )
}

// GET — Get all project metadata
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getMembership(id, user.userId)
  if (!membership && user.role !== 'admin') {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  await ensureAITables()

  const rows = await query(
    `SELECT meta_key, meta_value FROM project_metadata WHERE project_id = $1`,
    [id]
  )

  const metadata: Record<string, string> = {}
  for (const row of rows as { meta_key: string; meta_value: string }[]) {
    metadata[row.meta_key] = row.meta_value
  }

  return NextResponse.json({ metadata })
}

// PUT — Update project metadata (upsert key-value pairs)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getMembership(id, user.userId)
  if (!membership && user.role !== 'admin') {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }
  if (user.role !== 'admin' && membership?.role !== 'project_manager') {
    return NextResponse.json({ error: 'Only project managers can update project metadata' }, { status: 403 })
  }

  await ensureAITables()

  const body = await req.json()
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Request body must be a key-value object' }, { status: 400 })
  }

  const allowedKeys = [
    'tech_stack', 'components', 'database_tables', 'api_endpoints',
    'documentation', 'coding_standards', 'dependencies',
  ]

  for (const [key, value] of Object.entries(body)) {
    if (!allowedKeys.includes(key)) continue
    if (typeof value !== 'string') continue

    await query(
      `INSERT INTO project_metadata (project_id, meta_key, meta_value)
       VALUES ($1, $2, $3)
       ON CONFLICT (project_id, meta_key) DO UPDATE SET meta_value = $3, updated_at = NOW()`,
      [id, key, value]
    )
  }

  // Return updated metadata
  const rows = await query(
    `SELECT meta_key, meta_value FROM project_metadata WHERE project_id = $1`,
    [id]
  )
  const metadata: Record<string, string> = {}
  for (const row of rows as { meta_key: string; meta_value: string }[]) {
    metadata[row.meta_key] = row.meta_value
  }

  return NextResponse.json({ metadata })
}
