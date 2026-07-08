// ─── /api/projects/[id]/prd/[versionId] ──────────────────────────────────────
// GET    — fetch a specific PRD version's full content
// PATCH  — edit content (saves as new current version; admin / PM only)
// DELETE — delete a version (admin only)

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, query, queryOne } from '@/lib/db'
import { ensureAITables } from '@/lib/migrate'

type Params = { params: Promise<{ id: string; versionId: string }> }

async function getAccess(projectId: string, userId: string, userRole: string) {
  const membership = await queryOne<{ role: string }>(
    'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
    [projectId, userId],
  )
  if (!membership && userRole !== 'admin') return null
  return { memberRole: membership?.role ?? 'admin' }
}

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: Params) {
  await ensureAITables()
  const { id: projectId, versionId } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getAccess(projectId, user.userId, user.role)
  if (!access) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const prd = await queryOne(
    `SELECT id, version, content, is_current, created_by, created_at
     FROM prd_versions WHERE id = $1 AND project_id = $2`,
    [versionId, projectId],
  )
  if (!prd) return NextResponse.json({ error: 'Version not found' }, { status: 404 })

  return NextResponse.json({ prd })
}

// ─── PATCH — Save edited content as new current version ──────────────────────

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id: projectId, versionId } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getAccess(projectId, user.userId, user.role)
  if (!access) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  if (user.role !== 'admin' && access.memberRole !== 'project_manager') {
    return NextResponse.json(
      { error: 'Only Project Managers and Administrators can edit a PRD.' },
      { status: 403 },
    )
  }

  const existing = await queryOne<{ version: number }>(
    'SELECT version FROM prd_versions WHERE id = $1 AND project_id = $2',
    [versionId, projectId],
  )
  if (!existing) return NextResponse.json({ error: 'Version not found' }, { status: 404 })

  const { content } = await req.json() as { content: string }
  if (!content?.trim()) {
    return NextResponse.json({ error: 'Content cannot be empty.' }, { status: 400 })
  }

  // Bump to a new version
  const versionRow = await queryOne<{ max_version: number }>(
    'SELECT COALESCE(MAX(version), 0) AS max_version FROM prd_versions WHERE project_id = $1',
    [projectId],
  )
  const nextVersion = (versionRow?.max_version ?? 0) + 1

  await query(
    'UPDATE prd_versions SET is_current = FALSE WHERE project_id = $1 AND is_current = TRUE',
    [projectId],
  )

  const prd = await queryOne(
    `INSERT INTO prd_versions (project_id, version, content, is_current, created_by)
     VALUES ($1, $2, $3, TRUE, $4)
     RETURNING id, version, is_current, created_at`,
    [projectId, nextVersion, content.trim(), user.userId],
  )

  return NextResponse.json({ prd })
}

// ─── DELETE — Admin only ─────────────────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id: projectId, versionId } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Only Administrators can delete PRD versions.' }, { status: 403 })
  }

  const existing = await queryOne(
    'SELECT id, is_current FROM prd_versions WHERE id = $1 AND project_id = $2',
    [versionId, projectId],
  )
  if (!existing) return NextResponse.json({ error: 'Version not found' }, { status: 404 })

  await query('DELETE FROM prd_versions WHERE id = $1', [versionId])
  return NextResponse.json({ message: 'PRD version deleted' })
}
