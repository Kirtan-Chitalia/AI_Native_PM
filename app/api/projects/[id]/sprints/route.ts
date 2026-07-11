import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, query, queryOne } from '@/lib/db'
import { ensureAITables } from '@/lib/migrate'

async function getMembership(projectId: string, userId: string) {
  return queryOne<{ role: string }>(
    'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
    [projectId, userId]
  )
}

// GET — List sprints for a project
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getMembership(id, user.userId)
  if (!membership && user.role !== 'admin') {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  await ensureAITables()

  const sprints = await query(
    `SELECT s.id, s.name, s.goal, s.start_date, s.end_date, s.status,
            s.created_by, s.created_at,
            COUNT(t.id) AS task_count,
            COUNT(t.id) FILTER (WHERE t.status = 'done') AS done_count
     FROM sprints s
     LEFT JOIN tasks t ON t.sprint_id = s.id
     WHERE s.project_id = $1
     GROUP BY s.id
     ORDER BY s.start_date ASC NULLS LAST`,
    [id]
  )

  return NextResponse.json({ sprints })
}

// POST — Create a sprint
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getMembership(id, user.userId)
  if (!membership && user.role !== 'admin') {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }
  if (user.role !== 'admin' && membership?.role !== 'project_manager') {
    return NextResponse.json({ error: 'Only project managers can create sprints' }, { status: 403 })
  }

  await ensureAITables()

  const { name, goal, startDate, endDate, status } = await req.json()
  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Sprint name is required' }, { status: 400 })
  }

  const validStatuses = ['planned', 'active', 'completed', 'cancelled']
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid sprint status' }, { status: 400 })
  }

  const sprint = await queryOne(
    `INSERT INTO sprints (project_id, name, goal, start_date, end_date, status, created_by)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'planned'), $7)
     RETURNING id, name, goal, start_date, end_date, status, created_at`,
    [id, name.trim(), goal || null, startDate || null, endDate || null, status, user.userId]
  )

  return NextResponse.json({ sprint }, { status: 201 })
}
