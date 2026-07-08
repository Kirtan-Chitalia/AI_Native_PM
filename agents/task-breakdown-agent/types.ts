// ─── Task Breakdown Agent — Shared Types ─────────────────────────────────────

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low'
export type TaskComplexity = 'low' | 'medium' | 'high'
export type SuggestedRole =
  | 'Frontend Developer'
  | 'Backend Developer'
  | 'Full Stack Developer'
  | 'QA Engineer'
  | 'DevOps Engineer'
  | 'UI/UX Designer'

export interface GeneratedTask {
  title: string
  description: string
  priority: TaskPriority
  complexity: TaskComplexity
  suggestedRole: SuggestedRole
  estimatedEffort: string // e.g. "2 days", "1 week"
  dependencies: string[] // titles of other tasks this depends on
}
