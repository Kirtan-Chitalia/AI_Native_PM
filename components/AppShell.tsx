'use client'

import { useEffect, useState } from 'react'
import Sidebar, { NavKey } from '@/components/Sidebar'
import TopHeader from '@/components/TopHeader'
import { useLocalStorage } from '@/hooks/useLocalStorage'

interface AppShellProps {
  active: NavKey
  pageTitle: string
  email: string
  onLogout: () => void
  children: React.ReactNode
}

const COLLAPSE_KEY = 'tasklynx-sidebar-collapsed'

export default function AppShell({ active, pageTitle, email, onLogout, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsedFlag, setCollapsedFlag] = useLocalStorage(COLLAPSE_KEY, '0')
  const collapsed = collapsedFlag === '1'
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState('member')

  const toggleCollapsed = () => setCollapsedFlag(collapsed ? '0' : '1')

  useEffect(() => {
    if (!email) return
    fetch('/api/users')
      .then((r) => r.json())
      .then((data) => {
        const match = (data.users || []).find((u: { email: string }) => u.email === email)
        if (match) {
          setDisplayName(match.display_name)
          setRole(match.role || 'member')
        } else {
          setDisplayName(email.split('@')[0])
        }
      })
      .catch(() => setDisplayName(email.split('@')[0]))
  }, [email])

  return (
    <div className="min-h-screen flex bg-[#F8F8F8] dark:bg-[#0A0A0A]">
      <Sidebar
        active={active}
        displayName={displayName || email.split('@')[0]}
        email={email}
        role={role}
        onLogout={onLogout}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
      />
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <TopHeader
          pageTitle={pageTitle}
          displayName={displayName || email.split('@')[0]}
          email={email}
          onLogout={onLogout}
          onOpenMobileSidebar={() => setMobileOpen(true)}
        />
        <main key={pageTitle} className="flex-1 min-w-0 animate-page">
          {children}
        </main>
      </div>
    </div>
  )
}
