'use client'

import { useCallback, useSyncExternalStore } from 'react'

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback)
  return () => window.removeEventListener('storage', callback)
}

/** Reads/writes a localStorage string value, re-rendering on cross-tab and same-tab changes. */
export function useLocalStorage(key: string, fallback: string) {
  const getSnapshot = useCallback(() => localStorage.getItem(key) ?? fallback, [key, fallback])
  const getServerSnapshot = useCallback(() => fallback, [fallback])
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const setValue = useCallback((next: string) => {
    localStorage.setItem(key, next)
    window.dispatchEvent(new Event('storage'))
  }, [key])

  return [value, setValue] as const
}
