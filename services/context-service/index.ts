// ─── Context Service ────────────────────────────────────────────────────────
// Pure database query service. Given a task ID, collects all project context
// from the database. Never calls an AI model. Returns a structured JSON
// object designed to minimize AI token usage when passed to the Research Agent.

import { query, queryOne } from '@/lib/db'
import type { TaskContextJSON } from './types'

/**
 * Collect full project context for a given task.
 * This is the single entry point for the Context Service.
 */
export async function getTaskContext(taskId: string): Promise<TaskContextJSON> {
  // 1. Task details
  const task = await queryOne<{
    id: string; title: string; description: string | null
    status: string; priority: string; story_points: number
    due_date: string | null; start_date: string | null
    project_id: string; assignee_id: string | null
    assignee_name: string | null; assignee_email: string | null
    progress: number; sprint_id: string | null; milestone_id: string | null
  }>(
    `SELECT t.id, t.title, t.description, t.status, t.priority, t.story_points,
            t.due_date, t.start_date, t.project_id, t.assignee_id,
            COALESCE(t.progress, 0) as progress,
            t.sprint_id, t.milestone_id,
            u.display_name AS assignee_name, u.email AS assignee_email
     FROM tasks t
     LEFT JOIN users u ON u.id = t.assignee_id
     WHERE t.id = $1`,
    [taskId]
  )

  if (!task) {
    throw new Error(`Task not found: ${taskId}`)
  }

  // 2. Project details
  const project = await queryOne<{
    id: string; name: string; description: string | null
    status: string; priority: string
  }>(
    `SELECT id, name, description, status, priority FROM projects WHERE id = $1`,
    [task.project_id]
  )

  if (!project) {
    throw new Error(`Project not found for task: ${taskId}`)
  }

  // 3. Current PRD (if any)
  const prd = await queryOne<{ content: string }>(
    `SELECT content FROM prd_versions
     WHERE project_id = $1 AND is_current = TRUE
     LIMIT 1`,
    [project.id]
  )

  // 4. Related tasks (same project, excluding self — limited to 20 for token efficiency)
  const relatedTasks = await query(
    `SELECT id, title, status, priority,
            (SELECT display_name FROM users WHERE id = t.assignee_id) AS assignee_name
     FROM tasks t
     WHERE project_id = $1 AND id != $2
     ORDER BY created_at DESC
     LIMIT 20`,
    [project.id, taskId]
  )

  // 5. Team members
  const teamMembers = await query(
    `SELECT pm.user_id, u.display_name, u.email, pm.role
     FROM project_members pm
     JOIN users u ON u.id = pm.user_id
     WHERE pm.project_id = $1
     ORDER BY pm.joined_at ASC`,
    [project.id]
  )

  // 6. Project metadata (tech stack, coding standards, etc.)
  const metadata = await query(
    `SELECT meta_key, meta_value FROM project_metadata WHERE project_id = $1`,
    [project.id]
  )

  const metaMap = new Map<string, string>()
  for (const row of metadata as { meta_key: string; meta_value: string }[]) {
    metaMap.set(row.meta_key, row.meta_value)
  }

  // Parse comma-separated lists from metadata
  const parseList = (key: string): string[] => {
    const val = metaMap.get(key)
    if (!val) return []
    return val.split(',').map((s: string) => s.trim()).filter(Boolean)
  }

  // 7. Sprint info (if task has one)
  let sprint = null
  if (task.sprint_id) {
    sprint = await queryOne<{
      id: string; name: string; goal: string | null
      start_date: string | null; end_date: string | null; status: string
    }>(
      `SELECT id, name, goal, start_date, end_date, status FROM sprints WHERE id = $1`,
      [task.sprint_id]
    )
  }

  // 8. Milestones for the project
  const milestones = await query(
    `SELECT id, name, due_date, status FROM milestones
     WHERE project_id = $1
     ORDER BY due_date ASC NULLS LAST`,
    [project.id]
  )

  return {
    task: {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      story_points: task.story_points,
      due_date: task.due_date,
      start_date: task.start_date,
      assignee_name: task.assignee_name,
      assignee_email: task.assignee_email,
      progress: task.progress,
    },
    feature: null, // No feature table in current schema
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      priority: project.priority,
      prd: prd?.content ?? null,
    },
    techStack: parseList('tech_stack'),
    relatedTasks: relatedTasks as {
      id: string; title: string; status: string; priority: string; assignee_name: string | null
    }[],
    existingComponents: parseList('components'),
    databaseSchema: parseList('database_tables'),
    apiEndpoints: parseList('api_endpoints'),
    documentation: parseList('documentation'),
    teamMembers: teamMembers as {
      user_id: string; display_name: string; email: string; role: string
    }[],
    sprint,
    milestones: milestones as {
      id: string; name: string; due_date: string | null; status: string
    }[],
    codingStandards: parseList('coding_standards'),
    dependencies: parseList('dependencies'),
  }
}
