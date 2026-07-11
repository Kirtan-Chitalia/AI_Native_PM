// ─── Analytics Types ─────────────────────────────────────────────────────────

export interface ProjectAnalytics {
  projectId: string
  projectName: string
  overallCompletion: number        // 0–100
  totalTasks: number
  tasksByStatus: StatusCount[]
  tasksByPriority: PriorityCount[]
  tasksByAssignee: AssigneeCount[]
  completedOverTime: TimeSeriesPoint[]
  createdOverTime: TimeSeriesPoint[]
  overdueTasks: number
  upcomingDeadlines: UpcomingDeadline[]
  burndownData: BurndownPoint[]
  velocityData: VelocityPoint[]
  sprintCompletion: number | null   // null if no sprints
}

export interface StatusCount {
  status: string
  label: string
  count: number
}

export interface PriorityCount {
  priority: string
  count: number
}

export interface AssigneeCount {
  userId: string
  displayName: string
  count: number
  completed: number
}

export interface TimeSeriesPoint {
  date: string
  count: number
}

export interface UpcomingDeadline {
  taskId: string
  title: string
  dueDate: string
  status: string
  assigneeName: string | null
  daysRemaining: number
}

export interface BurndownPoint {
  date: string
  remaining: number
  ideal: number
}

export interface VelocityPoint {
  sprintName: string
  completed: number
  committed: number
}

export interface UserAnalytics {
  userId: string
  displayName: string
  email: string
  totalAssigned: number
  completed: number
  pending: number
  inProgress: number
  overdue: number
  avgCompletionDays: number | null
  completionPercentage: number
  weeklyCompleted: TimeSeriesPoint[]
  monthlyCompleted: TimeSeriesPoint[]
  projectContributions: ProjectContribution[]
}

export interface ProjectContribution {
  projectId: string
  projectName: string
  tasksCompleted: number
  totalTasks: number
}

export interface KPIData {
  label: string
  value: number
  previousValue?: number
  suffix?: string
  trend?: 'up' | 'down' | 'flat'
  trendLabel?: string
  accent?: boolean
}
