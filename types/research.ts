// ─── Research Types ──────────────────────────────────────────────────────────
// Shared types for the Research Agent and Research UI.

export type ResourceCategory =
  | 'Documentation'
  | 'Library'
  | 'NPM Package'
  | 'Python Package'
  | 'GitHub Repository'
  | 'Tutorial'
  | 'Video'
  | 'API Reference'
  | 'Best Practice'
  | 'Testing'
  | 'Security'
  | 'Internal Resource'
  | 'Database'
  | 'Component'
  | 'Other'

export type ResourcePriority = 'Critical' | 'High' | 'Medium' | 'Low'

export interface ResearchResource {
  category: ResourceCategory
  title: string
  url: string
  description: string
  reason: string
  priority: ResourcePriority
}

export interface ResearchOutput {
  resources: ResearchResource[]
  summary: string
  taskId: string
}

export interface ResearchSession {
  id: string
  task_id: string
  context_json: TaskContextJSON
  result_json: ResearchOutput
  model_used: string | null
  duration_ms: number | null
  created_by: string
  created_at: string
}

// The shape returned by the Context Service
export interface TaskContextJSON {
  task: TaskContextTask
  feature: string | null
  project: TaskContextProject
  techStack: string[]
  relatedTasks: TaskContextRelatedTask[]
  existingComponents: string[]
  databaseSchema: string[]
  apiEndpoints: string[]
  documentation: string[]
  teamMembers: TaskContextMember[]
  sprint: TaskContextSprint | null
  milestones: TaskContextMilestone[]
  codingStandards: string[]
  dependencies: string[]
}

export interface TaskContextTask {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  story_points: number
  due_date: string | null
  start_date: string | null
  assignee_name: string | null
  assignee_email: string | null
  progress: number
}

export interface TaskContextProject {
  id: string
  name: string
  description: string | null
  status: string
  priority: string
  prd: string | null
}

export interface TaskContextRelatedTask {
  id: string
  title: string
  status: string
  priority: string
  assignee_name: string | null
}

export interface TaskContextMember {
  user_id: string
  display_name: string
  email: string
  role: string
}

export interface TaskContextSprint {
  id: string
  name: string
  goal: string | null
  start_date: string | null
  end_date: string | null
  status: string
}

export interface TaskContextMilestone {
  id: string
  name: string
  due_date: string | null
  status: string
}
