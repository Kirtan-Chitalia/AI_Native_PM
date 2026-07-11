'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDismiss } from '@/hooks/useDismiss'
import { SearchIcon } from '@/components/icons'

interface ProjectHit { id: string; name: string; type: 'project' }
interface TaskHit { id: string; title: string; project_id: string; type: 'task' }
interface PersonHit { id: string; display_name: string; email: string; type: 'person' }
type Hit = ProjectHit | TaskHit | PersonHit

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [projects, setProjects] = useState<ProjectHit[]>([])
  const [tasks, setTasks] = useState<TaskHit[]>([])
  const [people, setPeople] = useState<PersonHit[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [wasOpen, setWasOpen] = useState(false)

  useDismiss(open, onClose, containerRef)

  if (open && !wasOpen) {
    setWasOpen(true)
    setQuery('')
  } else if (!open && wasOpen) {
    setWasOpen(false)
  }

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    Promise.all([
      fetch('/api/projects').then((r) => r.json()),
      fetch('/api/tasks').then((r) => r.json()),
      fetch('/api/users').then((r) => r.json()),
    ]).then(([p, t, u]) => {
      setProjects((p.projects || []).map((x: { id: string; name: string }) => ({ id: x.id, name: x.name, type: 'project' as const })))
      setTasks((t.tasks || []).map((x: { id: string; title: string; project_id: string }) => ({ id: x.id, title: x.title, project_id: x.project_id, type: 'task' as const })))
      setPeople((u.users || []).map((x: { id: string; display_name: string; email: string }) => ({ id: x.id, display_name: x.display_name, email: x.email, type: 'person' as const })))
    })
  }, [open])

  const results = useMemo<Hit[]>(() => {
    const q = query.trim().toLowerCase()
    if (!q) return [...projects, ...tasks, ...people].slice(0, 8)
    return [
      ...projects.filter((p) => p.name.toLowerCase().includes(q)),
      ...tasks.filter((t) => t.title.toLowerCase().includes(q)),
      ...people.filter((u) => u.display_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)),
    ].slice(0, 20)
  }, [query, projects, tasks, people])

  const go = (hit: Hit) => {
    if (hit.type === 'project') router.push(`/projects/${hit.id}`)
    else if (hit.type === 'task') router.push(`/projects/${hit.project_id}`)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-[60] flex items-start justify-center pt-24 px-4">
      <div ref={containerRef} role="dialog" aria-modal="true" aria-label="Search"
        className="w-full max-w-lg bg-white dark:bg-[#1A1A1A] border border-[#E5E7EB] dark:border-[#2A2A2A] rounded-xl shadow-2xl animate-dropdown overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#E5E7EB] dark:border-[#2A2A2A]">
          <SearchIcon className="w-4 h-4 text-[#9CA3AF] shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks, projects, people..."
            className="flex-1 bg-transparent text-[13px] text-[#0A0A0A] dark:text-white placeholder-[#9CA3AF] focus:outline-none"
          />
          <kbd className="text-[11px] text-[#9CA3AF] border border-[#E5E7EB] dark:border-[#2A2A2A] rounded px-1.5 py-0.5">Esc</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto py-1.5">
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13px] text-[#9CA3AF]">No results</p>
          ) : (
            results.map((hit) => (
              <button
                key={`${hit.type}-${hit.id}`}
                onClick={() => go(hit)}
                className="w-full flex items-center gap-2 px-4 py-2 text-left text-[13px] text-[#0A0A0A] dark:text-white hover:bg-[#F8F8F8] dark:hover:bg-[#242424] transition-colors"
              >
                <span className="text-[11px] uppercase tracking-wide text-[#9CA3AF] w-14 shrink-0">{hit.type}</span>
                <span className="truncate">
                  {hit.type === 'project' ? hit.name : hit.type === 'task' ? hit.title : hit.display_name}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
