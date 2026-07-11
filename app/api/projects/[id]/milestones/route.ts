import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, query, queryOne } from '@/lib/db'
import { ensureAITables } from '@/lib/migrate'

async function getMembership(projectId: string, userId: string) {
  return queryOne<{ role: string }>(
    'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
    [projectId, userId]
  )
}

// GET — List milestones for a project
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getMembership(id, user.userId)
  if (!membership && user.role !== 'admin') {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  await ensureAITables()

  const milestones = await query(
    `SELECT id, name, description, due_date, status, created_by, created_at
     FROM milestones
     WHERE project_id = $1
     ORDER BY due_date ASC NULLS LAST`,
    [id]
  )

  return NextResponse.json({ milestones })
}

// POST — Create a milestone
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getMembership(id, user.userId)
  if (!membership && user.role !== 'admin') {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }
  if (user.role !== 'admin' && membership?.role !== 'project_manager') {
    return NextResponse.json({ error: 'Only project managers can create milestones' }, { status: 403 })
  }

  await ensureAITables()

  const { name, description, dueDate, status } = await req.json()
  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Milestone name is required' }, { status: 400 })
  }

  const validStatuses = ['pending', 'in_progress', 'completed', 'missed']
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid milestone status' }, { status: 400 })
  }

  const milestone = await queryOne(
    `INSERT INTO milestones (project_id, name, description, due_date, status, created_by)
     VALUES ($1, $2, $3, $4, COALESCE($5, 'pending'), $6)
     RETURNING id, name, description, due_date, status, created_at`,
    [id, name.trim(), description || null, dueDate || null, status, user.userId]
  )

  return NextResponse.json({ milestone }, { status: 201 })
}
