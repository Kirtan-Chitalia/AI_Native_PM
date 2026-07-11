'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import Skeleton from '@/components/Skeleton'

interface UserData {
  id: string
  email: string
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<{ projects: number; tasks: number; doneTasks: number; users: number } | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => {
        if (!r.ok) throw new Error('Unauthorized')
        return r.json()
      })
      .then((data) => setUser(data.user))
      .catch(() => router.push('/login'))
  }, [router])

  useEffect(() => {
    fetch('/api/analytics/overview')
      .then((r) => r.json())
      .then((d) => setStats(d))
      .finally(() => setLoading(false))
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  if (!user || loading) {
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
    <AppShell active="analytics" pageTitle="Analytics" email={user.email} onLogout={handleLogout}>
      <div className="p-4">
        <h2 className="text-xl font-semibold mb-4">Analytics</h2>
        {!stats && <div className="text-sm text-gray-500">Loading…</div>}
        {stats && (
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 border rounded">
              <div className="text-sm text-gray-500">Projects</div>
              <div className="text-2xl font-bold">{stats.projects}</div>
            </div>
            <div className="p-4 border rounded">
              <div className="text-sm text-gray-500">Tasks</div>
              <div className="text-2xl font-bold">{stats.tasks}</div>
            </div>
            <div className="p-4 border rounded">
              <div className="text-sm text-gray-500">Completed</div>
              <div className="text-2xl font-bold">{stats.doneTasks}</div>
            </div>
            <div className="p-4 border rounded">
              <div className="text-sm text-gray-500">Users</div>
              <div className="text-2xl font-bold">{stats.users}</div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
