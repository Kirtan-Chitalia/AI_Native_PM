import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, query, queryOne } from '@/lib/db'

async function getTaskWithMembership(taskId: string, userId: string) {
  return queryOne<{ project_id: string; assignee_id: string | null; role: string }>(
    `SELECT t.project_id, t.assignee_id, pm.role
     FROM tasks t
     JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = $2
     WHERE t.id = $1`,
    [taskId, userId]
  )
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const context = await getTaskWithMembership(taskId, user.userId)
  if (!context) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

  const canEdit = ['owner', 'manager', 'contributor'].includes(context.role) || context.assignee_id === user.userId
  if (!canEdit) {
    return NextResponse.json({ error: 'You do not have permission to edit this task' }, { status: 403 })
  }

  const { title, description, status, priority, dueDate, assigneeId } = await req.json()
  const validStatuses = ['todo', 'in_progress', 'in_review', 'done', 'cancelled']
  const validPriorities = ['critical', 'high', 'medium', 'low']
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }
  if (priority && !validPriorities.includes(priority)) {
    return NextResponse.json({ error: 'Invalid priority' }, { status: 400 })
  }

  if (assigneeId) {
    const assigneeMembership = await queryOne(
      'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
      [context.project_id, assigneeId]
    )
    if (!assigneeMembership) {
      return NextResponse.json({ error: 'Assignee must be a member of this project' }, { status: 400 })
    }
  }

  const task = await queryOne(
    `UPDATE tasks SET
        title = COALESCE($2, title),
        description = COALESCE($3, description),
        status = COALESCE($4, status),
        priority = COALESCE($5, priority),
        due_date = COALESCE($6, due_date),
        assignee_id = COALESCE($7, assignee_id),
        completed_at = CASE WHEN $4 = 'done' THEN NOW() ELSE completed_at END,
        updated_at = NOW()
     WHERE id = $1
     RETURNING id, title, description, status, priority, due_date, assignee_id, created_by, created_at`,
    [taskId, title, description, status, priority, dueDate, assigneeId]
  )

  return NextResponse.json({ task })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const context = await getTaskWithMembership(taskId, user.userId)
  if (!context) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  if (!['owner', 'manager', 'contributor'].includes(context.role)) {
    return NextResponse.json({ error: 'You do not have permission to delete this task' }, { status: 403 })
  }

  await query('DELETE FROM tasks WHERE id = $1', [taskId])
  return NextResponse.json({ message: 'Task deleted' })
}
