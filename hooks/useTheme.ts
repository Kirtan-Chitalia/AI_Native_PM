'use client'

import { useCallback, useEffect } from 'react'
import { useLocalStorage } from './useLocalStorage'

const STORAGE_KEY = 'tasklynx-theme'
type Theme = 'light' | 'dark'

export function useTheme() {
  const [stored, setStored] = useLocalStorage(STORAGE_KEY, 'light')
  const theme: Theme = stored === 'dark' ? 'dark' : 'light'

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const setTheme = useCallback((next: Theme) => setStored(next), [setStored])
  const toggleTheme = useCallback(() => setTheme(theme === 'dark' ? 'light' : 'dark'), [theme, setTheme])

  return { theme, setTheme, toggleTheme }
}
