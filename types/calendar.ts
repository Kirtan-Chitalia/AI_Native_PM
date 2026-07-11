// ─── Calendar Types ──────────────────────────────────────────────────────────

export type CalendarViewMode = 'month' | 'week' | 'day'

export type CalendarEventType = 'task' | 'sprint_start' | 'sprint_end' | 'milestone' | 'deadline'

export interface CalendarEvent {
  id: string
  title: string
  date: string               // ISO date string
  endDate?: string            // ISO date string (for sprints)
  type: CalendarEventType
  status: string
  priority: string
  projectId: string
  projectName: string
  assigneeName: string | null
  assigneeId: string | null
  sprintName?: string
  isOverdue: boolean
  isCompleted: boolean
}

export interface CalendarFilters {
  projectId: string | null
  sprintId: string | null
  userId: string | null
  priority: string | null
  status: string | null
  dateFrom: string | null
  dateTo: string | null
}

export interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  events: CalendarEvent[]
}
