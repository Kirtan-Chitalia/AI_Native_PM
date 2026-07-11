 'use client'

import { useEffect, useMemo, useState } from 'react'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, format } from 'date-fns'
import TaskDrawer, { DrawerTask } from '@/components/TaskDrawer'

interface CalendarEvent {
  id: string
  title: string
  date: string
  endDate?: string | null
  type: string
  projectId?: string
  projectName?: string
  assigneeName?: string | null
}

export default function CalendarView({ initialDate }: { initialDate?: string }) {
  const [current, setCurrent] = useState(() => initialDate ? new Date(initialDate) : new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const [filters, setFilters] = useState({ projectId: '' as string, userId: '' as string })

  const [selectedTask, setSelectedTask] = useState<DrawerTask | null>(null)
  const [members, setMembers] = useState<{ user_id: string; display_name: string; email: string; role: string }[]>([])
  const [myUser, setMyUser] = useState<{ id: string; email: string; role: string } | null>(null)

  const monthStart = useMemo(() => startOfMonth(current), [current])
  const monthEnd = useMemo(() => endOfMonth(current), [current])
  const gridStart = useMemo(() => startOfWeek(monthStart, { weekStartsOn: 1 }), [monthStart])
  const gridEnd = useMemo(() => endOfWeek(monthEnd, { weekStartsOn: 1 }), [monthEnd])

  const loadProjects = async () => {
    try {
      const r = await fetch('/api/projects')
      const d = await r.json()
      setProjects(d.projects || [])
    } catch {}
  }

  const loadMyUser = async () => {
    try {
      const r = await fetch('/api/auth/me')
      const d = await r.json()
      if (r.ok) setMyUser({ id: d.user.id, email: d.user.email, role: d.user.role })
    } catch {}
  }

  const loadEvents = async () => {
    const from = gridStart.toISOString()
    const to = gridEnd.toISOString()
    setLoading(true)
    try {
      let url = `/api/calendar/events?dateFrom=${encodeURIComponent(from)}&dateTo=${encodeURIComponent(to)}`
      if (filters.projectId) url += `&projectId=${encodeURIComponent(filters.projectId)}`
      if (filters.userId) url += `&userId=${encodeURIComponent(filters.userId)}`
      const r = await fetch(url)
      const d = await r.json()
      setEvents(d.events || [])
    } catch {
      setEvents([])
    } finally { setLoading(false) }
  }

  useEffect(() => { void loadProjects(); void loadMyUser() }, [])
  useEffect(() => { void loadEvents() }, [gridStart, gridEnd, filters])

  const weeks: Date[][] = []
  let cursor = gridStart
  while (cursor <= gridEnd) {
    const week: Date[] = []
    for (let i = 0; i < 7; i++) {
      week.push(cursor)
      cursor = addDays(cursor, 1)
    }
    weeks.push(week)
  }

  const eventsByDate = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>()
    for (const e of events) {
      const d = new Date(e.date).toISOString().slice(0, 10)
      if (!m.has(d)) m.set(d, [])
      m.get(d)!.push(e)
    }
    return m
  }, [events])

  const openTask = async (event: CalendarEvent) => {
    if (!event || event.type !== 'task') return
    try {
      const r = await fetch(`/api/tasks/${event.id}`)
      const d = await r.json()
      if (!r.ok) return
      const task = d.task as DrawerTask
      // load project members
      const pm = await fetch(`/api/projects/${event.projectId}/members`)
      const pmj = await pm.json()
      setMembers(pmj.members || [])
      setSelectedTask(task)
    } catch (err) {
      // ignore
    }
  }

  const handleCloseTask = () => { setSelectedTask(null); void loadEvents() }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrent(addDays(monthStart, -1))} className="px-2 py-1 border rounded">Prev</button>
          <div className="text-[16px] font-semibold">{format(monthStart, 'MMMM yyyy')}</div>
          <button onClick={() => setCurrent(addDays(monthEnd, 1))} className="px-2 py-1 border rounded">Next</button>
        </div>
        <div className="flex items-center gap-2">
          <select value={filters.projectId} onChange={(e) => setFilters((f) => ({ ...f, projectId: e.target.value }))}
            className="px-2 py-1 border rounded">
            <option value="">All projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) => (
          <div key={d} className="text-[12px] text-[#6B7280] text-center font-medium">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2 mt-2">
        {weeks.map((week) => (
          week.map((day) => {
            const iso = day.toISOString().slice(0,10)
            const dayEvents = eventsByDate.get(iso) || []
            return (
              <div key={iso} className={`p-2 min-h-[88px] rounded-lg border ${day.getMonth() === monthStart.getMonth() ? 'bg-white dark:bg-[#111]' : 'bg-white/5 dark:bg-transparent'} border-[#E5E7EB] dark:border-[#2A2A2A]`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[12px] font-medium">{day.getDate()}</div>
                  <div className="text-[11px] text-[#9CA3AF]">{dayEvents.length}</div>
                </div>
                <div className="space-y-1 overflow-hidden">
                  {loading ? <div className="text-[12px] text-[#9CA3AF]">Loading…</div>
                    : dayEvents.slice(0,3).map((e) => (
                      <button key={e.id} onClick={() => void openTask(e)} className="w-full text-left text-[12px] truncate bg-[#F3F4F6] dark:bg-[#1A1A1A] px-2 py-1 rounded">{e.title} <span className="text-[10px] text-[#6B7280]">{e.projectName}</span></button>
                    ))}
                </div>
              </div>
            )
          })
        ))}
      </div>

      {selectedTask && (
        <TaskDrawer
          task={selectedTask}
          members={members}
          myRole={myUser?.role ?? 'developer'}
          currentUserId={myUser?.id ?? ''}
          currentUserName={myUser?.email?.split('@')?.[0] ?? ''}
          onClose={handleCloseTask}
          onUpdated={() => { void loadEvents() }}
        />
      )}
    </div>
  )
}
