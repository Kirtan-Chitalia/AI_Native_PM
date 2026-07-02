'use client'

import { useTheme } from '@/hooks/useTheme'
import { SunIcon, MoonIcon } from '@/components/icons'

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`w-8 h-8 flex items-center justify-center rounded-lg text-[#6B7280] dark:text-[#A1A1AA] hover:text-[#0A0A0A] dark:hover:text-white hover:bg-[#F8F8F8] dark:hover:bg-[#242424] transition-colors ${className}`}
    >
      {theme === 'dark' ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
    </button>
  )
}
