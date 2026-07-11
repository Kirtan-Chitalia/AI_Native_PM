'use client'

import { useUserPanel } from '@/components/UserPanelProvider'

interface AvatarProps {
  userId?: string
  name?: string | null
  email?: string | null
  size?: number
  clickable?: boolean
  className?: string
}

export default function Avatar({ userId, name, email, size = 28, clickable = true, className = '' }: AvatarProps) {
  const { openUserPanel } = useUserPanel()
  const initial = (name || email || '?')[0]?.toUpperCase()
  const canClick = clickable && !!userId

  return (
    <button
      type="button"
      aria-label={canClick ? `View ${name || email}` : undefined}
      onClick={canClick ? (e) => { e.stopPropagation(); openUserPanel(userId!) } : undefined}
      disabled={!canClick}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.4) }}
      className={`shrink-0 rounded-full bg-[#E5002B] text-white font-medium flex items-center justify-center transition-transform ${canClick ? 'hover:scale-105 cursor-pointer' : 'cursor-default'} ${className}`}
    >
      {initial}
    </button>
  )
}
