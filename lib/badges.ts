export const STATUS_STYLES: Record<string, string> = {
  planning: 'bg-[#F3F4F6] text-[#374151] dark:bg-[#242424] dark:text-[#D4D4D4]',
  active: 'bg-[#F0FDF4] text-[#15803D] dark:bg-[#0f2a17] dark:text-[#4ADE80]',
  on_hold: 'bg-[#FFFBEB] text-[#B45309] dark:bg-[#2a2210] dark:text-[#FBBF24]',
  completed: 'bg-[#F0FDF4] text-[#15803D] dark:bg-[#0f2a17] dark:text-[#4ADE80]',
  archived: 'bg-[#F3F4F6] text-[#6B7280] dark:bg-[#242424] dark:text-[#9CA3AF]',
  cancelled: 'bg-[#FEF2F2] text-[#B91C1C] dark:bg-[#2a1010] dark:text-[#F87171]',
  todo: 'bg-[#F3F4F6] text-[#374151] dark:bg-[#242424] dark:text-[#D4D4D4]',
  in_progress: 'bg-[#0A0A0A] text-white dark:bg-[#F5F5F5] dark:text-[#0A0A0A]',
  in_review: 'bg-[#FFFBEB] text-[#B45309] dark:bg-[#2a2210] dark:text-[#FBBF24]',
  done: 'bg-[#F0FDF4] text-[#15803D] dark:bg-[#0f2a17] dark:text-[#4ADE80]',
}

export const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
  cancelled: 'Cancelled',
}

export const PRIORITY_STYLES: Record<string, string> = {
  critical: 'bg-[#FEF2F2] text-[#E5002B] dark:bg-[#2a1010] dark:text-[#FF4D6D]',
  high: 'bg-[#FFF7ED] text-[#F97316] dark:bg-[#2a1a0a] dark:text-[#FB923C]',
  medium: 'bg-[#F3F4F6] text-[#6B7280] dark:bg-[#242424] dark:text-[#9CA3AF]',
  low: 'bg-[#F0FDF4] text-[#22C55E] dark:bg-[#0f2a17] dark:text-[#4ADE80]',
}

export const PRIORITY_DOT: Record<string, string> = {
  critical: 'bg-[#E5002B]',
  high: 'bg-[#F97316]',
  medium: 'bg-[#6B7280]',
  low: 'bg-[#22C55E]',
}

export const STORY_POINTS = [1, 2, 3, 5, 8, 13, 21] as const
