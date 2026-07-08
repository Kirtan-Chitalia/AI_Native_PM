// ─── POST /api/projects/[id]/ai-tasks — Generate AI tasks ────────────────────
// ─── GET  /api/projects/[id]/ai-tasks — Get latest AI task generation ────────

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, queryOne } from '@/lib/db'
import { generateTasks } from '@/agents/task-breakdown-agent/service'
import { ensureAITables } from '@/lib/migrate'
import type { AIError } from '@/lib/ai/types'

type Params = { params: Promise<{ id: string }> }

async function getAccess(projectId: string, userId: string, userRole: string) {
  const membership = await queryOne<{ role: string }>(
    'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
    [projectId, userId],
  )
  if (!membership && userRole !== 'admin') return null
  return { memberRole: membership?.role ?? 'admin' }
}

// ─── GET — Latest AI task generation ─────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: Params) {
  await ensureAITables()
  const { id: projectId } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getAccess(projectId, user.userId, user.role)
  if (!access) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const generation = await queryOne<{
    id: string
    version: number
    tasks_json: unknown
    model_used: string
    created_at: string
    prd_version_id: string | null
  }>(
    `SELECT id, version, tasks_json, model_used, created_at, prd_version_id
     FROM ai_task_generations
     WHERE project_id = $1
     ORDER BY version DESC LIMIT 1`,
    [projectId],
  )

  if (!generation) return NextResponse.json({ generation: null })
  return NextResponse.json({ generation })
}

// ─── POST — Generate tasks from current PRD ───────────────────────────────────

export async function POST(_req: NextRequest, { params }: Params) {
  await ensureAITables()
  const { id: projectId } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await getAccess(projectId, user.userId, user.role)
  if (!access) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  if (user.role !== 'admin' && access.memberRole !== 'project_manager') {
    return NextResponse.json(
      { error: 'Only Project Managers and Administrators can generate tasks.' },
      { status: 403 },
    )
  }

  // Require a current PRD
  const prd = await queryOne<{ id: string; content: string }>(
    `SELECT id, content FROM prd_versions
     WHERE project_id = $1 AND is_current = TRUE`,
    [projectId],
  )
  if (!prd) {
    return NextResponse.json(
      { error: 'A PRD must be generated and saved before tasks can be generated.' },
      { status: 400 },
    )
  }

  try {
    const result = await generateTasks(prd.content)

    // Determine next version number
    const versionRow = await queryOne<{ max_version: number }>(
      'SELECT COALESCE(MAX(version), 0) AS max_version FROM ai_task_generations WHERE project_id = $1',
      [projectId],
    )
    const nextVersion = (versionRow?.max_version ?? 0) + 1

    const generation = await queryOne<{ id: string; version: number; created_at: string }>(
      `INSERT INTO ai_task_generations
         (project_id, prd_version_id, version, tasks_json, model_used, duration_ms, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, version, created_at`,
      [
        projectId,
        prd.id,
        nextVersion,
        JSON.stringify(result.data.tasks),
        result.model,
        result.durationMs,
        user.userId,
      ],
    )

    return NextResponse.json(
      {
        generation: {
          id: (generation as { id: string }).id,
          version: nextVersion,
          tasks: result.data.tasks,
          model_used: result.model,
          created_at: (generation as { created_at: string }).created_at,
        },
        meta: { durationMs: result.durationMs },
      },
      { status: 201 },
    )
  } catch (err: unknown) {
    const aiErr = err as AIError
    if (aiErr.code) {
      const status = aiErr.code === 'UNAVAILABLE' || aiErr.code === 'TIMEOUT' ? 503 : 422
      return NextResponse.json(
        { error: aiErr.message, code: aiErr.code, retryable: aiErr.retryable },
        { status },
      )
    }
    console.error('[AI Tasks generate]', err)
    return NextResponse.json(
      { error: 'Failed to generate tasks. Please try again.' },
      { status: 500 },
    )
  }
}
