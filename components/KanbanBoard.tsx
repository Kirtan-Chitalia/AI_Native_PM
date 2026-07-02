'use client'

import { useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent } from '@dnd-kit/core'
import KanbanColumn from '@/components/KanbanColumn'
import TaskCard, { KanbanTask } from '@/components/TaskCard'

const TASK_STATUSES = ['todo', 'in_progress', 'in_review', 'done']

interface KanbanBoardProps {
  tasks: KanbanTask[]
  onOpenTask: (task: KanbanTask) => void
  onStatusChange: (taskId: string, status: string) => void
}

export default function KanbanBoard({ tasks, onOpenTask, onStatusChange }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTask(event.active.data.current?.task as KanbanTask)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null)
    const { active, over } = event
    if (!over) return
    const newStatus = over.id as string
    const task = active.data.current?.task as KanbanTask
    if (task && task.status !== newStatus) {
      onStatusChange(task.id, newStatus)
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveTask(null)}>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {TASK_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasks.filter((t) => t.status === status)}
            activeId={activeTask?.id ?? null}
            onOpenTask={onOpenTask}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask && (
          <div className="dragging-card">
            <TaskCard task={activeTask} onOpen={() => {}} dimmed={false} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
