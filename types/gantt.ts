// ─── Gantt Chart Types ───────────────────────────────────────────────────────

export type GanttZoomLevel = 'day' | 'week' | 'month'

export type DependencyType = 'FS' | 'FF' | 'SS' | 'SF'

export interface GanttTask {
  id: string
  title: string
  startDate: string | null      // ISO date
  dueDate: string | null        // ISO date
  status: string
  priority: string
  progress: number              // 0–100
  assigneeName: string | null
  assigneeId: string | null
  parentTaskId: string | null
  sprintName: string | null
  storyPoints: number
  children: GanttTask[]
  dependencies: GanttDependency[]
  isExpanded: boolean
  depth: number
}

export interface GanttDependency {
  predecessorId: string
  successorId: string
  type: DependencyType
}

export interface GanttViewState {
  zoom: GanttZoomLevel
  startDate: Date
  endDate: Date
  expandedIds: Set<string>
}

export interface GanttProject {
  id: string
  name: string
  tasks: GanttTask[]
  sprints: GanttSprint[]
  milestones: GanttMilestone[]
}

export interface GanttSprint {
  id: string
  name: string
  startDate: string | null
  endDate: string | null
  status: string
}

export interface GanttMilestone {
  id: string
  name: string
  dueDate: string | null
  status: string
}
