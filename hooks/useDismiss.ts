'use client'

import { useEffect, useRef } from 'react'

/**
 * Closes a panel/modal on Escape or an outside click, and restores focus to
 * whatever triggered it when it closes.
 */
export function useDismiss(active: boolean, onClose: () => void, containerRef: React.RefObject<HTMLElement | null>) {
  const triggerRef = useRef<Element | null>(null)

  useEffect(() => {
    if (!active) return
    triggerRef.current = document.activeElement

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleClick)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handleClick)
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])
}
