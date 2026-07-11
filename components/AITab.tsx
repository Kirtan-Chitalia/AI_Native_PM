'use client'

// ─── AITab ────────────────────────────────────────────────────────────────────
// Integrated AI panel on the project detail page.
// Sections: PRD Generator | Task Breakdown
// Follows existing design conventions exactly (colors, button patterns, modals).

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import Skeleton from '@/components/Skeleton'
import MarkdownRenderer from '@/components/MarkdownRenderer'
import { PRIORITY_STYLES } from '@/lib/badges'

// ─── Types ───────────────────────────────────────────────────────────────────

interface PRDVersion {
  id: string
  version: number
  is_current: boolean
  created_at: string
  created_by_name?: string
  char_count?: number
}

interface PRDData {
  id: string
  version: number
  content: string
  is_current: boolean
  created_at: string
}

interface GeneratedTask {
  title: string
  description: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  complexity: 'low' | 'medium' | 'high'
  suggestedRole: string
  estimatedEffort: string
  dependencies: string[]
}

interface TaskGeneration {
  id: string
  version: number
  tasks_json: GeneratedTask[]
  model_used: string
  created_at: string
}

interface AIError {
  error: string
  code?: string
  retryable?: boolean
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface AITabProps {
  projectId: string
  projectName: string
  projectDescription: string
  myRole: string // 'admin' | 'project_manager' | 'developer'
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function AISpinner() {
  return (
    <div className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-ai-spin" />
  )
}

function ErrorBanner({
  message,
  retryable,
  onRetry,
}: {
  message: string
  retryable?: boolean
  onRetry?: () => void
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 bg-[#fef2f2] dark:bg-[#2a1010] border border-[#fecaca] dark:border-[#5a2020] rounded-lg">
      <svg className="w-4 h-4 text-[#E5002B] shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
      </svg>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-[#b91c1c] dark:text-[#F87171]">{message}</p>
        {retryable && onRetry && (
          <button
            onClick={onRetry}
            className="mt-1 text-[12px] text-[#E5002B] underline hover:no-underline transition-all"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  )
}

const COMPLEXITY_STYLES: Record<string, string> = {
  low: 'bg-[#F0FDF4] text-[#15803D] dark:bg-[#0f2a17] dark:text-[#4ADE80]',
  medium: 'bg-[#FFFBEB] text-[#B45309] dark:bg-[#2a2210] dark:text-[#FBBF24]',
  high: 'bg-[#FEF2F2] text-[#E5002B] dark:bg-[#2a1010] dark:text-[#FF4D6D]',
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AITab({
  projectId,
  projectName,
  projectDescription,
  myRole,
}: AITabProps) {
  const canGenerate = myRole === 'admin' || myRole === 'project_manager'

  // ── PRD state ──────────────────────────────────────────────────────────────
  const [prd, setPrd] = useState<PRDData | null>(null)
  const [prdLoading, setPrdLoading] = useState(true)
  const [prdGenerating, setPrdGenerating] = useState(false)
  const [prdError, setPrdError] = useState<AIError | null>(null)

  const [prdHistory, setPrdHistory] = useState<PRDVersion[]>([])
  const [showPrdHistory, setShowPrdHistory] = useState(false)
  const [prdHistoryLoading, setPrdHistoryLoading] = useState(false)

  const [editingPrd, setEditingPrd] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [savingPrd, setSavingPrd] = useState(false)

  // ── Task state ─────────────────────────────────────────────────────────────
  const [taskGen, setTaskGen] = useState<TaskGeneration | null>(null)
  const [tasksLoading, setTasksLoading] = useState(true)
  const [tasksGenerating, setTasksGenerating] = useState(false)
  const [tasksError, setTasksError] = useState<AIError | null>(null)
  const [importingTaskIdx, setImportingTaskIdx] = useState<number | null>(null)

  const [taskHistory, setTaskHistory] = useState<{ id: string; version: number; task_count: number; created_at: string }[]>([])
  const [showTaskHistory, setShowTaskHistory] = useState(false)
  const [historyGenLoading, setHistoryGenLoading] = useState(false)
  const [historyTasks, setHistoryTasks] = useState<GeneratedTask[] | null>(null)

  // ── Initial data load ──────────────────────────────────────────────────────
  const loadPrd = useCallback(async () => {
    setPrdLoading(true)
    setPrdError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/prd`)
      const data = await res.json()
      setPrd(data.prd ?? null)
    } catch {
      // silently — UI shows "no PRD yet" state
    } finally {
      setPrdLoading(false)
    }
  }, [projectId])

  const loadTasks = useCallback(async () => {
    setTasksLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/ai-tasks`)
      const data = await res.json()
      setTaskGen(data.generation ?? null)
    } catch {
      // silently
    } finally {
      setTasksLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void (async () => {
      await Promise.all([loadPrd(), loadTasks()])
    })()
  }, [loadPrd, loadTasks])

  // ── PRD Generate ──────────────────────────────────────────────────────────
  const handleGeneratePrd = async () => {
    setPrdGenerating(true)
    setPrdError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/prd`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName, projectDescription }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPrdError({ error: data.error, code: data.code, retryable: data.retryable })
        return
      }
      setPrd(data.prd)
      toast.success(`PRD v${data.prd.version} generated`)
    } catch {
      setPrdError({ error: 'Network error. Please check your connection and try again.', retryable: true })
    } finally {
      setPrdGenerating(false)
    }
  }

  // ── PRD Save Edit ─────────────────────────────────────────────────────────
  const handleSavePrd = async () => {
    if (!prd) return
    setSavingPrd(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/prd/${prd.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      await loadPrd()
      setEditingPrd(false)
      toast.success('PRD saved as new version')
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSavingPrd(false)
    }
  }

  // ── PRD History ───────────────────────────────────────────────────────────
  const handleShowPrdHistory = async () => {
    setShowPrdHistory(true)
    if (prdHistory.length > 0) return
    setPrdHistoryLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/prd/history`)
      const data = await res.json()
      setPrdHistory(data.versions ?? [])
    } catch {
      toast.error('Failed to load PRD history')
    } finally {
      setPrdHistoryLoading(false)
    }
  }

  // ── Tasks Generate ────────────────────────────────────────────────────────
  const handleGenerateTasks = async () => {
    setTasksGenerating(true)
    setTasksError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/ai-tasks`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setTasksError({ error: data.error, code: data.code, retryable: data.retryable })
        return
      }
      setTaskGen({
        id: data.generation.id,
        version: data.generation.version,
        tasks_json: data.generation.tasks,
        model_used: data.generation.model_used,
        created_at: data.generation.created_at,
      })
      toast.success(`${data.generation.tasks.length} tasks generated`)
    } catch {
      setTasksError({ error: 'Network error. Please check your connection and try again.', retryable: true })
    } finally {
      setTasksGenerating(false)
    }
  }

  // ── Task Import ───────────────────────────────────────────────────────────
  const handleImportTask = async (task: GeneratedTask, idx: number) => {
    setImportingTaskIdx(idx)
    try {
      const priorityMap: Record<string, number> = { critical: 21, high: 13, medium: 5, low: 2 }
      const storyPoints = priorityMap[task.priority] ?? 5

      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: task.title,
          description: `${task.description}\n\n**Role:** ${task.suggestedRole}  \n**Effort:** ${task.estimatedEffort}  \n**Complexity:** ${task.complexity}`,
          priority: task.priority,
          storyPoints,
        }),
      })
      if (!res.ok) { const d = await res.json(); toast.error(d.error); return }
      toast.success('Task imported to project')
    } catch {
      toast.error('Failed to import task')
    } finally {
      setImportingTaskIdx(null)
    }
  }

  // ── Task History ──────────────────────────────────────────────────────────
  const handleShowTaskHistory = async () => {
    setShowTaskHistory(true)
    if (taskHistory.length > 0) return
    try {
      const res = await fetch(`/api/projects/${projectId}/ai-tasks/history`)
      const data = await res.json()
      setTaskHistory(data.history ?? [])
    } catch {
      toast.error('Failed to load task history')
    }
  }

  const handleLoadHistoryGen = async (genId: string) => {
    setHistoryGenLoading(true)
    setHistoryTasks(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/ai-tasks/history`)
      const data = await res.json()
      const allHistory = data.history ?? []
      const match = allHistory.find((h: { id: string }) => h.id === genId)
      if (match) {
        if (taskGen && taskGen.id === genId) {
          setHistoryTasks(taskGen.tasks_json)
        } else {
          setHistoryTasks(null)
        }
      }
    } catch {
      toast.error('Failed to load generation')
    } finally {
      setHistoryGenLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const displayTasks = historyTasks ?? taskGen?.tasks_json ?? []

  return (
    <div className="space-y-6 animate-page">
      {/* ──────────────── PRD SECTION ──────────────────────────────────────── */}
      <section className="bg-white dark:bg-[#1A1A1A] border border-[#E5E7EB] dark:border-[#2A2A2A] rounded-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB] dark:border-[#2A2A2A]">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#FEF2F2] dark:bg-[#2a1010]">
              <svg className="w-4 h-4 text-[#E5002B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/>
                <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/>
              </svg>
            </span>
            <div>
              <h2 className="text-[14px] font-semibold text-[#0A0A0A] dark:text-white">
                Product Requirements Document
              </h2>
              {prd && (
                <p className="text-[11px] text-[#9CA3AF]">
                  Version {prd.version} · {new Date(prd.created_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {prd && (
              <button
                onClick={handleShowPrdHistory}
                className="px-2.5 py-1.5 text-[12px] text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#0A0A0A] dark:hover:text-white border border-[#E5E7EB] dark:border-[#2A2A2A] rounded-lg hover:border-[#0A0A0A] dark:hover:border-[#525252] transition-colors"
              >
                History
              </button>
            )}
            {canGenerate && prd && (
              <button
                onClick={() => { setEditContent(prd.content); setEditingPrd(true) }}
                className="px-2.5 py-1.5 text-[12px] text-[#0A0A0A] dark:text-white border border-[#E5E7EB] dark:border-[#2A2A2A] rounded-lg hover:border-[#0A0A0A] dark:hover:border-[#525252] transition-colors"
              >
                Edit
              </button>
            )}
            {canGenerate && (
              <button
                id="ai-generate-prd-btn"
                onClick={handleGeneratePrd}
                disabled={prdGenerating}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E5002B] hover:bg-[#CC0025] active:scale-[0.98] disabled:opacity-60 text-white text-[13px] font-medium rounded-lg transition-all duration-150"
              >
                {prdGenerating ? (
                  <><AISpinner />{prd ? 'Regenerating…' : 'Generating…'}</>
                ) : (
                  <>{prd ? 'Regenerate PRD' : 'Generate PRD'}</>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          {prdError && (
            <div className="mb-4">
              <ErrorBanner
                message={prdError.error}
                retryable={prdError.retryable}
                onRetry={handleGeneratePrd}
              />
            </div>
          )}

          {prdLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-4 w-1/4 mt-4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ) : prd ? (
            <MarkdownRenderer content={prd.content} />
          ) : (
            <div className="py-10 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#F3F4F6] dark:bg-[#242424] mb-3">
                <svg className="w-6 h-6 text-[#9CA3AF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <p className="text-[14px] text-[#6B7280] dark:text-[#9CA3AF] font-medium">No PRD yet</p>
              <p className="text-[12px] text-[#9CA3AF] mt-1">
                {canGenerate
                  ? 'Click "Generate PRD" to create a Product Requirements Document from your project details.'
                  : 'The Project Manager will generate a PRD for this project.'}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ──────────────── TASK BREAKDOWN SECTION ─────────────────────────── */}
      <section className="bg-white dark:bg-[#1A1A1A] border border-[#E5E7EB] dark:border-[#2A2A2A] rounded-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB] dark:border-[#2A2A2A]">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#F0F9FF] dark:bg-[#0f1a2a]">
              <svg className="w-4 h-4 text-[#0284C7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
            </span>
            <div>
              <h2 className="text-[14px] font-semibold text-[#0A0A0A] dark:text-white">
                AI Task Breakdown
              </h2>
              {taskGen && (
                <p className="text-[11px] text-[#9CA3AF]">
                  Generation {taskGen.version} · {taskGen.tasks_json.length} tasks · {new Date(taskGen.created_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {taskGen && (
              <button
                onClick={handleShowTaskHistory}
                className="px-2.5 py-1.5 text-[12px] text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#0A0A0A] dark:hover:text-white border border-[#E5E7EB] dark:border-[#2A2A2A] rounded-lg hover:border-[#0A0A0A] dark:hover:border-[#525252] transition-colors"
              >
                History
              </button>
            )}
            {canGenerate && prd && (
              <button
                id="ai-generate-tasks-btn"
                onClick={handleGenerateTasks}
                disabled={tasksGenerating || !prd}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0284C7] hover:bg-[#0369A1] active:scale-[0.98] disabled:opacity-60 text-white text-[13px] font-medium rounded-lg transition-all duration-150"
              >
                {tasksGenerating ? (
                  <><AISpinner />{taskGen ? 'Regenerating…' : 'Generating…'}</>
                ) : (
                  <>{taskGen ? 'Regenerate Tasks' : 'Generate Tasks'}</>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          {tasksError && (
            <div className="mb-4">
              <ErrorBanner
                message={tasksError.error}
                retryable={tasksError.retryable}
                onRetry={handleGenerateTasks}
              />
            </div>
          )}

          {tasksLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 p-4 border border-[#E5E7EB] dark:border-[#2A2A2A] rounded-lg">
                  <Skeleton className="h-4 w-16 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : displayTasks.length > 0 ? (
            <div className="space-y-3">
              {displayTasks.map((task, idx) => (
                <TaskCard
                  key={idx}
                  task={task}
                  idx={idx}
                  canGenerate={canGenerate}
                  importing={importingTaskIdx === idx}
                  onImport={() => handleImportTask(task, idx)}
                />
              ))}
            </div>
          ) : !prd ? (
            <div className="py-8 text-center">
              <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF]">
                Generate a PRD first to enable AI task breakdown.
              </p>
            </div>
          ) : (
            <div className="py-10 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#F3F4F6] dark:bg-[#242424] mb-3">
                <svg className="w-6 h-6 text-[#9CA3AF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              <p className="text-[14px] text-[#6B7280] dark:text-[#9CA3AF] font-medium">No tasks generated yet</p>
              <p className="text-[12px] text-[#9CA3AF] mt-1">
                {canGenerate
                  ? 'Click "Generate Tasks" to create a structured task list from the PRD.'
                  : 'The Project Manager will generate tasks from the PRD.'}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ──────────────── PRD EDIT MODAL ──────────────────────────────────── */}
      {editingPrd && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-[#1A1A1A] border border-[#E5E7EB] dark:border-[#2A2A2A] rounded-xl shadow-lg w-full max-w-3xl my-8">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB] dark:border-[#2A2A2A]">
              <h2 className="text-[15px] font-semibold text-[#0A0A0A] dark:text-white">Edit PRD</h2>
              <button onClick={() => setEditingPrd(false)} className="text-[#9CA3AF] hover:text-[#0A0A0A] dark:hover:text-white transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="px-5 py-5">
              <p className="text-[12px] text-[#9CA3AF] mb-3">Saving will create a new version and preserve the current one.</p>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={22}
                className="w-full px-3 py-2.5 bg-white dark:bg-[#141414] border border-[#E5E7EB] dark:border-[#2A2A2A] rounded-lg text-[#0A0A0A] dark:text-white text-[13px] font-mono focus:outline-none focus:border-[#E5002B] resize-none leading-relaxed"
              />
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button onClick={() => setEditingPrd(false)}
                className="flex-1 py-2.5 border border-[#E5E7EB] dark:border-[#2A2A2A] text-[#0A0A0A] dark:text-white text-[13px] font-medium rounded-lg hover:border-[#0A0A0A] dark:hover:border-[#525252] transition-colors">
                Cancel
              </button>
              <button onClick={handleSavePrd} disabled={savingPrd}
                className="flex-1 py-2.5 bg-[#E5002B] hover:bg-[#CC0025] active:scale-[0.98] disabled:opacity-50 text-white text-[13px] font-medium rounded-lg transition-all duration-150">
                {savingPrd ? 'Saving…' : 'Save as New Version'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── PRD HISTORY MODAL ──────────────────────────────── */}
      {showPrdHistory && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#1A1A1A] border border-[#E5E7EB] dark:border-[#2A2A2A] rounded-xl shadow-lg w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB] dark:border-[#2A2A2A]">
              <h2 className="text-[15px] font-semibold text-[#0A0A0A] dark:text-white">PRD Version History</h2>
              <button onClick={() => setShowPrdHistory(false)} className="text-[#9CA3AF] hover:text-[#0A0A0A] dark:hover:text-white">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="px-5 py-4 max-h-72 overflow-y-auto">
              {prdHistoryLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                </div>
              ) : prdHistory.length === 0 ? (
                <p className="text-[13px] text-[#9CA3AF] text-center py-4">No history yet.</p>
              ) : (
                <div className="divide-y divide-[#E5E7EB] dark:divide-[#2A2A2A]">
                  {prdHistory.map((v) => (
                    <div key={v.id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium text-[#0A0A0A] dark:text-white">v{v.version}</span>
                          {v.is_current && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#F0FDF4] text-[#15803D] dark:bg-[#0f2a17] dark:text-[#4ADE80]">Current</span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                          {new Date(v.created_at).toLocaleString()}
                          {v.created_by_name && ` · ${v.created_by_name}`}
                          {v.char_count && ` · ${v.char_count.toLocaleString()} chars`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── TASK HISTORY MODAL ─────────────────────────────── */}
      {showTaskHistory && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#1A1A1A] border border-[#E5E7EB] dark:border-[#2A2A2A] rounded-xl shadow-lg w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB] dark:border-[#2A2A2A]">
              <h2 className="text-[15px] font-semibold text-[#0A0A0A] dark:text-white">Task Generation History</h2>
              <button onClick={() => { setShowTaskHistory(false); setHistoryTasks(null) }} className="text-[#9CA3AF] hover:text-[#0A0A0A] dark:hover:text-white">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="px-5 py-4 max-h-72 overflow-y-auto">
              {taskHistory.length === 0 ? (
                <p className="text-[13px] text-[#9CA3AF] text-center py-4">No history yet.</p>
              ) : (
                <div className="divide-y divide-[#E5E7EB] dark:divide-[#2A2A2A]">
                  {taskHistory.map((h) => (
                    <div key={h.id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[13px] font-medium text-[#0A0A0A] dark:text-white">Generation {h.version}</span>
                        <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                          {h.task_count} tasks · {new Date(h.created_at).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleLoadHistoryGen(h.id)}
                        disabled={historyGenLoading}
                        className="text-[12px] text-[#E5002B] hover:underline transition-all disabled:opacity-50"
                      >
                        View
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({
  task,
  idx,
  canGenerate,
  importing,
  onImport,
}: {
  task: GeneratedTask
  idx: number
  canGenerate: boolean
  importing: boolean
  onImport: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-[#E5E7EB] dark:border-[#2A2A2A] rounded-lg overflow-hidden transition-all duration-150 hover:border-[#D1D5DB] dark:hover:border-[#3A3A3A]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-[#F8F8F8] dark:hover:bg-[#242424] transition-colors"
      >
        <span className="text-[11px] text-[#9CA3AF] font-mono shrink-0 mt-0.5 w-5 text-right">{idx + 1}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${PRIORITY_STYLES[task.priority]}`}>
              {task.priority}
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${COMPLEXITY_STYLES[task.complexity]}`}>
              {task.complexity} complexity
            </span>
          </div>
          <p className="text-[13px] font-medium text-[#0A0A0A] dark:text-white">{task.title}</p>
        </div>
        <svg
          className={`w-4 h-4 text-[#9CA3AF] shrink-0 mt-0.5 transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <polyline points="6,9 12,15 18,9"/>
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-[#F3F4F6] dark:border-[#242424] bg-[#FAFAFA] dark:bg-[#161616]">
          <p className="text-[13px] text-[#4B5563] dark:text-[#9CA3AF] mb-3 leading-relaxed">{task.description}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] mb-3">
            <div className="flex gap-1.5">
              <span className="text-[#9CA3AF]">Role:</span>
              <span className="text-[#374151] dark:text-[#D4D4D4] font-medium">{task.suggestedRole}</span>
            </div>
            <div className="flex gap-1.5">
              <span className="text-[#9CA3AF]">Effort:</span>
              <span className="text-[#374151] dark:text-[#D4D4D4] font-medium">{task.estimatedEffort}</span>
            </div>
            {task.dependencies.length > 0 && (
              <div className="col-span-2 flex gap-1.5">
                <span className="text-[#9CA3AF] shrink-0">Depends on:</span>
                <span className="text-[#374151] dark:text-[#D4D4D4]">{task.dependencies.join(', ')}</span>
              </div>
            )}
          </div>
          {canGenerate && (
            <button
              onClick={onImport}
              disabled={importing}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E7EB] dark:border-[#2A2A2A] text-[#0A0A0A] dark:text-white hover:border-[#E5002B] hover:text-[#E5002B] text-[12px] font-medium rounded-lg transition-all duration-150 disabled:opacity-50"
            >
              {importing ? <><span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-ai-spin" />Importing…</> : '+ Import to Project'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
