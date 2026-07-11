import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, query } from '@/lib/db'

// GET — Fetch calendar events between date range with optional filters
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const dateFrom = url.searchParams.get('dateFrom')
  const dateTo = url.searchParams.get('dateTo')
  const projectId = url.searchParams.get('projectId')
  const userId = url.searchParams.get('userId')
  const sprintId = url.searchParams.get('sprintId')
  const priority = url.searchParams.get('priority')
  const status = url.searchParams.get('status')

  if (!dateFrom || !dateTo) {
    return NextResponse.json({ error: 'dateFrom and dateTo are required' }, { status: 400 })
  }

  // Build WHERE clauses and params
  const params: any[] = [dateFrom, dateTo]
  let extraWhere = ''
  if (projectId) { params.push(projectId); extraWhere += ` AND t.project_id = $${params.length}` }
  if (userId) { params.push(userId); extraWhere += ` AND t.assignee_id = $${params.length}` }
  if (sprintId) { params.push(sprintId); extraWhere += ` AND t.sprint_id = $${params.length}` }
  if (priority) { params.push(priority); extraWhere += ` AND t.priority = $${params.length}` }
  if (status) { params.push(status); extraWhere += ` AND t.status = $${params.length}` }

  // Tasks (due dates)
  const tasksSql = `SELECT t.id::text AS id, t.title, t.due_date::timestamptz AS date, NULL::timestamptz AS end_date,
    'task' AS type, t.status, t.priority, t.project_id::text AS project_id, p.name AS project_name,
    u.display_name AS assignee_name, t.assignee_id::text AS assignee_id, s.name AS sprint_name,
    (t.due_date < NOW() AND t.status != 'done') AS is_overdue, (t.status = 'done') AS is_completed
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    LEFT JOIN users u ON u.id = t.assignee_id
    LEFT JOIN sprints s ON s.id = t.sprint_id
    WHERE t.due_date::timestamptz BETWEEN $1::timestamptz AND $2::timestamptz ${extraWhere}`

  // Sprints (start/end)
  const sprintsSql = `SELECT ('sprint-' || s.id)::text AS id, s.name AS title, s.start_date::timestamptz AS date, s.end_date::timestamptz AS end_date,
    'sprint' AS type, s.status AS status, 'medium' AS priority, s.project_id::text AS project_id, p.name AS project_name,
    NULL::text AS assignee_name, NULL::text AS assignee_id, s.name AS sprint_name,
    FALSE AS is_overdue, (s.status = 'completed') AS is_completed
    FROM sprints s
    JOIN projects p ON p.id = s.project_id
    WHERE (s.start_date::timestamptz BETWEEN $1::timestamptz AND $2::timestamptz) OR (s.end_date::timestamptz BETWEEN $1::timestamptz AND $2::timestamptz)`

  // Milestones (due_date)
  const milestonesSql = `SELECT m.id::text AS id, m.name AS title, m.due_date::timestamptz AS date, NULL::timestamptz AS end_date,
    'milestone' AS type, m.status AS status, 'medium' AS priority, m.project_id::text AS project_id, p.name AS project_name,
    NULL::text AS assignee_name, NULL::text AS assignee_id, NULL::text AS sprint_name,
    (m.due_date < NOW() AND m.status != 'completed') AS is_overdue, (m.status = 'completed') AS is_completed
    FROM milestones m
    JOIN projects p ON p.id = m.project_id
    WHERE m.due_date::timestamptz BETWEEN $1::timestamptz AND $2::timestamptz`

  try {
    const rows = await query(`(${tasksSql}) UNION ALL (${sprintsSql}) UNION ALL (${milestonesSql}) ORDER BY date ASC`, params)
    // Map to API shape
    const events = rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      date: r.date,
      endDate: r.end_date,
      type: r.type,
      status: r.status,
      priority: r.priority,
      projectId: r.project_id,
      projectName: r.project_name,
      assigneeName: r.assignee_name,
      assigneeId: r.assignee_id,
      sprintName: r.sprint_name,
      isOverdue: r.is_overdue,
      isCompleted: r.is_completed,
    }))

    return NextResponse.json({ events })
  } catch (err) {
    console.error('[calendar api] fetch events error', err)
    return NextResponse.json({ error: 'Failed to load calendar events' }, { status: 500 })
  }
}
