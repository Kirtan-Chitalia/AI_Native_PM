'use client'

import { useDroppable } from '@dnd-kit/core'
import TaskCard, { KanbanTask } from '@/components/TaskCard'
import { STATUS_LABELS } from '@/lib/badges'

interface KanbanColumnProps {
  status: string
  tasks: KanbanTask[]
  activeId: string | null
  onOpenTask: (task: KanbanTask) => void
}

export default function KanbanColumn({ status, tasks, activeId, onOpenTask }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div className="w-72 shrink-0">
      <p className="text-[13px] font-medium text-[#0A0A0A] dark:text-white mb-2 px-0.5">
        {STATUS_LABELS[status] || status}
        <span className="text-[#9CA3AF] font-normal ml-1">({tasks.length})</span>
      </p>
      <div
        ref={setNodeRef}
        className={`space-y-2 min-h-[120px] rounded-lg p-2 -m-2 transition-colors duration-150 border-2 ${
          isOver ? 'border-[#E5002B] bg-[#E5002B]/[0.04]' : 'border-transparent'
        }`}
      >
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} onOpen={onOpenTask} dimmed={!!activeId && activeId !== t.id} />
        ))}
      </div>
    </div>
  )
}
