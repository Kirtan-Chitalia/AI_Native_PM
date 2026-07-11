'use client'

import { useEffect, useRef, useState } from 'react'
import { useDismiss } from '@/hooks/useDismiss'
import { MenuIcon, SearchIcon, BellIcon } from '@/components/icons'
import ThemeToggle from '@/components/ThemeToggle'
import CommandPalette from '@/components/CommandPalette'

interface TopHeaderProps {
  pageTitle: string
  displayName: string
  email: string
  onLogout: () => void
  onOpenMobileSidebar: () => void
}

export default function TopHeader({ pageTitle, displayName, email, onLogout, onOpenMobileSidebar }: TopHeaderProps) {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useDismiss(menuOpen, () => setMenuOpen(false), menuRef)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(true)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return (
    <>
      <header className="h-12 shrink-0 bg-white dark:bg-[#141414] border-b border-[#E5E7EB] dark:border-[#2A2A2A] flex items-center justify-between px-4 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onOpenMobileSidebar} aria-label="Open menu"
            className="md:hidden text-[#6B7280] dark:text-[#A1A1AA] hover:text-[#0A0A0A] dark:hover:text-white">
            <MenuIcon className="w-5 h-5" />
          </button>
          <h1 className="text-[15px] font-semibold text-[#0A0A0A] dark:text-white truncate">{pageTitle}</h1>
        </div>

        <button
          onClick={() => setPaletteOpen(true)}
          className="hidden sm:flex items-center gap-2 w-[280px] px-3 py-1.5 bg-[#F8F8F8] dark:bg-[#1A1A1A] border border-[#E5E7EB] dark:border-[#2A2A2A] rounded-md text-[13px] text-[#9CA3AF] hover:border-[#0A0A0A] dark:hover:border-[#525252] transition-colors"
        >
          <SearchIcon className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Search tasks, projects, people...</span>
          <kbd className="ml-auto text-[10px] border border-[#E5E7EB] dark:border-[#2A2A2A] rounded px-1 py-0.5 shrink-0">⌘K</kbd>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setPaletteOpen(true)}
            aria-label="Search"
            className="sm:hidden w-8 h-8 flex items-center justify-center rounded-lg text-[#6B7280] dark:text-[#A1A1AA] hover:bg-[#F8F8F8] dark:hover:bg-[#242424] transition-colors"
          >
            <SearchIcon className="w-4 h-4" />
          </button>
          <ThemeToggle />
          <button aria-label="Notifications" className="w-8 h-8 flex items-center justify-center rounded-lg text-[#6B7280] dark:text-[#A1A1AA] hover:bg-[#F8F8F8] dark:hover:bg-[#242424] transition-colors">
            <BellIcon className="w-4 h-4" />
          </button>
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Account menu"
              aria-expanded={menuOpen}
              className="w-8 h-8 rounded-full bg-[#E5002B] text-white text-xs font-medium flex items-center justify-center hover:scale-105 transition-transform"
            >
              {displayName?.[0]?.toUpperCase()}
            </button>
            {menuOpen && (
              <div className="animate-dropdown absolute right-0 mt-2 w-48 bg-white dark:bg-[#1A1A1A] border border-[#E5E7EB] dark:border-[#2A2A2A] rounded-lg shadow-lg py-1 z-50">
                <div className="px-3 py-2 border-b border-[#E5E7EB] dark:border-[#2A2A2A]">
                  <p className="text-[13px] text-[#0A0A0A] dark:text-white truncate">{displayName}</p>
                  <p className="text-[11px] text-[#9CA3AF] truncate">{email}</p>
                </div>
                <button onClick={onLogout} className="w-full text-left px-3 py-2 text-[13px] text-[#0A0A0A] dark:text-white hover:bg-[#F8F8F8] dark:hover:bg-[#242424] transition-colors">
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  )
}
