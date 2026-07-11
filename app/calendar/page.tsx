'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import CalendarView from '@/components/CalendarView'
import Skeleton from '@/components/Skeleton'

interface UserData {
  id: string
  email: string
}

export default function CalendarPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => {
        if (!r.ok) throw new Error('Unauthorized')
        return r.json()
      })
      .then((data) => setUser(data.user))
      .catch(() => router.push('/login'))
  }, [router])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8F8F8] dark:bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-full max-w-md px-6 space-y-3">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-24" />
        </div>
      </div>
    )
  }

  return (
    <AppShell active="calendar" pageTitle="Calendar" email={user.email} onLogout={handleLogout}>
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Calendar</h1>
        <CalendarView />
      </div>
    </AppShell>
  )
}
