// ─── POST /api/projects/[id]/prd  — Generate PRD ─────────────────────────────
// ─── GET  /api/projects/[id]/prd  — Get current PRD ─────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, query, queryOne } from '@/lib/db'
import { generatePRD } from '@/agents/prd-agent/service'
import { ensureAITables } from '@/lib/migrate'
import type { AIError } from '@/lib/ai/types'

type Params = { params: Promise<{ id: string }> }

// ─── RBAC helpers ─────────────────────────────────────────────────────────────

async function getProjectAccess(projectId: string, userId: string, userRole: string) {
  const membership = await queryOne<{ role: string }>(
    'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
    [projectId, userId],
  )
  if (!membership && userRole !== 'admin') return null
  return { memberRole: membership?.role ?? 'admin' }
}

function canGenerate(userRole: string, memberRole: string) {
  return userRole === 'admin' || memberRole === 'project_manager'
}

// ─── GET — Read current PRD (any authenticated member) ───────────────────────

export async function GET(_req: NextRequest, { params }: Params) {
  await ensureAITables()
  const { id: projectId } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getProjectAccess(projectId, user.userId, user.role)
  if (!access) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const prd = await queryOne<{
    id: string
    version: number
    content: string
    is_current: boolean
    created_by: string
    created_at: string
  }>(
    `SELECT id, version, content, is_current, created_by, created_at
     FROM prd_versions
     WHERE project_id = $1 AND is_current = TRUE`,
    [projectId],
  )

  if (!prd) return NextResponse.json({ prd: null })
  return NextResponse.json({ prd })
}

// ─── POST — Generate (or regenerate) a PRD ────────────────────────────────────

export async function POST(req: NextRequest, { params }: Params) {
  await ensureAITables()
  const { id: projectId } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getProjectAccess(projectId, user.userId, user.role)
  if (!access) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  if (!canGenerate(user.role, access.memberRole)) {
    return NextResponse.json(
      { error: 'Only Project Managers and Administrators can generate a PRD.' },
      { status: 403 },
    )
  }

  // Fetch project details to provide to the agent
  const project = await queryOne<{ name: string; description: string | null }>(
    'SELECT name, description FROM projects WHERE id = $1',
    [projectId],
  )
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const projectName = (body['projectName'] as string | undefined)?.trim() || project.name
  const projectDescription =
    (body['projectDescription'] as string | undefined)?.trim() || project.description || ''

  if (!projectDescription) {
    return NextResponse.json(
      { error: 'Project description is required to generate a PRD.' },
      { status: 400 },
    )
  }

  try {
    // Run the PRD agent
    const result = await generatePRD(projectName, projectDescription)

    // Determine next version number
    const versionRow = await queryOne<{ max_version: number }>(
      'SELECT COALESCE(MAX(version), 0) AS max_version FROM prd_versions WHERE project_id = $1',
      [projectId],
    )
    const nextVersion = (versionRow?.max_version ?? 0) + 1

    // Unset any existing current PRD
    await query(
      'UPDATE prd_versions SET is_current = FALSE WHERE project_id = $1 AND is_current = TRUE',
      [projectId],
    )

    // Insert new version
    const prd = await queryOne<{ id: string; version: number; created_at: string }>(
      `INSERT INTO prd_versions (project_id, version, content, is_current, created_by)
       VALUES ($1, $2, $3, TRUE, $4)
       RETURNING id, version, created_at`,
      [projectId, nextVersion, result.data.content, user.userId],
    )

    return NextResponse.json(
      {
        prd: {
          id: (prd as { id: string }).id,
          version: nextVersion,
          content: result.data.content,
          is_current: true,
          created_at: (prd as { created_at: string }).created_at,
        },
        meta: {
          model: result.model,
          durationMs: result.durationMs,
        },
      },
      { status: 201 },
    )
  } catch (err: unknown) {
    const aiErr = err as AIError
    if (aiErr.code) {
      const status =
        aiErr.code === 'UNAVAILABLE' || aiErr.code === 'TIMEOUT' ? 503 : 422
      return NextResponse.json({ error: aiErr.message, code: aiErr.code, retryable: aiErr.retryable }, { status })
    }
    console.error('[PRD generate]', err)
    return NextResponse.json({ error: 'Failed to generate PRD. Please try again.' }, { status: 500 })
  }
}
