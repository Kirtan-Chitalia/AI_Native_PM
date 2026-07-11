'use client'

import { createContext, useContext, useMemo, useState } from 'react'
import UserPanel from '@/components/UserPanel'

interface UserPanelContextValue {
  openUserPanel: (userId: string) => void
  closeUserPanel: () => void
}

const UserPanelContext = createContext<UserPanelContextValue | null>(null)

export function useUserPanel() {
  const ctx = useContext(UserPanelContext)
  if (!ctx) throw new Error('useUserPanel must be used within UserPanelProvider')
  return ctx
}

export default function UserPanelProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null)

  const value = useMemo<UserPanelContextValue>(() => ({
    openUserPanel: (id: string) => setUserId(id),
    closeUserPanel: () => setUserId(null),
  }), [])

  return (
    <UserPanelContext.Provider value={value}>
      {children}
      <UserPanel userId={userId} onClose={() => setUserId(null)} />
    </UserPanelContext.Provider>
  )
}
