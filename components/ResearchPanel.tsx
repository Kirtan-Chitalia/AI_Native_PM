 'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import Skeleton from './Skeleton'

export interface ResearchResource {
  category: string
  title: string
  url: string
  description: string
  reason: string
  priority: string
}

export interface ResearchSession {
  id: string
  task_id: string
  result_json: { summary: string; resources: ResearchResource[] }
  model_used: string | null
  duration_ms: number | null
  created_by: string
  created_at: string
}

export default function ResearchPanel({ taskId, canGenerate }: { taskId: string; canGenerate: boolean }) {
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [sessions, setSessions] = useState<ResearchSession[]>([])
  const [selected, setSelected] = useState<ResearchSession | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tasks/${taskId}/research`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load research sessions')
      setSessions(data.sessions || [])
    } catch (err: any) {
      setError(err?.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (taskId) void load() }, [taskId])

  const handleGenerate = async () => {
    if (!canGenerate) return toast.error('Insufficient permissions')
    setGenerating(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}/research`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Generation failed'); return }
      toast.success('Research generated')
      // prepend new session
      setSessions((s) => [data.session, ...s])
      setSelected(data.session)
    } catch {
      toast.error('Network error')
    } finally { setGenerating(false) }
  }

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Delete this research session? This cannot be undone.')) return
    try {
      const res = await fetch(`/api/tasks/${taskId}/research/${sessionId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Delete failed'); return }
      setSessions((s) => s.filter((x) => x.id !== sessionId))
      if (selected?.id === sessionId) setSelected(null)
      toast.success('Research session deleted')
    } catch {
      toast.error('Network error')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-semibold text-[#0A0A0A] dark:text-white">Research</h3>
        <div className="flex items-center gap-2">
          {canGenerate && (
            <button onClick={handleGenerate} disabled={generating}
              className="px-2.5 py-1.5 bg-[#E5002B] hover:bg-[#CC0025] text-white text-[12px] rounded-lg disabled:opacity-60">
              {generating ? 'Generating…' : 'Generate Research'}
            </button>
          )}
        </div>
      </div>

      {error && <div className="mb-3 text-[13px] text-[#B91C1C]">{error}</div>}

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-3 md:col-span-1">
          <div className="space-y-2">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="py-6 text-[13px] text-[#6B7280]">No research sessions yet.</div>
            ) : (
              sessions.map((s) => (
                <div key={s.id} className={`p-3 rounded-lg border ${selected?.id === s.id ? 'border-[#E5002B] bg-white/5' : 'border-[#E5E7EB] dark:border-[#2A2A2A]'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[12px] font-medium">{new Date(s.created_at).toLocaleString()}</div>
                      <div className="text-[11px] text-[#6B7280]">{s.model_used ?? 'model'}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setSelected(s)} className="text-[12px] text-[#0A0A0A] hover:underline">View</button>
                      <button onClick={() => handleDelete(s.id)} className="text-[12px] text-[#B91C1C] hover:underline">Delete</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="col-span-3 md:col-span-2">
          {selected ? (
            <div className="space-y-3">
              <div className="text-[13px] text-[#6B7280]">{selected.result_json.summary}</div>
              <div className="grid gap-3">
                {selected.result_json.resources.map((r, i) => (
                  <div key={i} className="p-3 border border-[#E5E7EB] dark:border-[#2A2A2A] rounded-lg bg-white dark:bg-[#0f0f0f]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-semibold text-[#0A0A0A] dark:text-white">{r.title}</span>
                          <span className="text-[11px] text-[#6B7280]">{r.category}</span>
                        </div>
                        <a href={r.url} target="_blank" rel="noreferrer" className="text-[12px] text-[#0284C7] hover:underline">{r.url}</a>
                      </div>
                      <div className="text-[12px] px-2 py-1 rounded text-white bg-[#6B7280]">{r.priority}</div>
                    </div>
                    <p className="text-[13px] text-[#374151] dark:text-[#D4D4D4] mt-2">{r.description}</p>
                    {r.reason && <p className="text-[12px] text-[#6B7280] mt-2">Reason: {r.reason}</p>}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-6 text-[13px] text-[#6B7280]">Select a session to view its resources.</div>
          )}
        </div>
      </div>
    </div>
  )
}
