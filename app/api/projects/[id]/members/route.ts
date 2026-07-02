import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, query, queryOne, DEFAULT_ORG_ID } from '@/lib/db'

async function getMembership(projectId: string, userId: string) {
  return queryOne<{ role: string }>(
    'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
    [projectId, userId]
  )
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getMembership(id, user.userId)
  if (!membership) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const members = await query(
    `SELECT pm.user_id, pm.role, pm.joined_at, u.email, u.display_name
     FROM project_members pm JOIN users u ON u.id = pm.user_id
     WHERE pm.project_id = $1 ORDER BY pm.joined_at ASC`,
    [id]
  )

  return NextResponse.json({ members })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getMembership(id, user.userId)
  if (!membership) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  if (!['owner', 'manager'].includes(membership.role)) {
    return NextResponse.json({ error: 'Only owners and managers can add members' }, { status: 403 })
  }

  const { email, role } = await req.json()
  const validRoles = ['owner', 'manager', 'contributor', 'reviewer', 'observer']
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }
  if (role && !validRoles.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const targetUser = await queryOne<{ id: string }>(
    'SELECT id FROM users WHERE org_id = $1 AND email = $2',
    [DEFAULT_ORG_ID, email.toLowerCase().trim()]
  )
  if (!targetUser) {
    return NextResponse.json({ error: 'No user with that email has signed in to the platform yet' }, { status: 404 })
  }

  const member = await queryOne(
    `INSERT INTO project_members (project_id, user_id, role)
     VALUES ($1, $2, COALESCE($3, 'contributor'))
     ON CONFLICT (project_id, user_id) DO UPDATE SET role = COALESCE($3, project_members.role)
     RETURNING project_id, user_id, role, joined_at`,
    [id, targetUser.id, role]
  )

  return NextResponse.json({ member }, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getMembership(id, user.userId)
  if (!membership) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  if (!['owner', 'manager'].includes(membership.role)) {
    return NextResponse.json({ error: 'Only owners and managers can remove members' }, { status: 403 })
  }

  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  if (userId === user.userId && membership.role === 'owner') {
    return NextResponse.json({ error: 'The project owner cannot remove themselves' }, { status: 400 })
  }

  await query('DELETE FROM project_members WHERE project_id = $1 AND user_id = $2', [id, userId])
  return NextResponse.json({ message: 'Member removed' })
}
