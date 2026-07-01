'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface UserData {
  id: string
  email: string
  verified: boolean
  createdAt: string
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => {
        if (!r.ok) throw new Error('Unauthorized')
        return r.json()
      })
      .then((data) => setUser(data.user))
      .catch(() => router.push('/'))
      .finally(() => setLoading(false))
  }, [router])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#111827] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <header className="bg-white border-b border-[#e5e7eb]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#111827] flex items-center justify-center text-white text-xs font-semibold">
              PM
            </div>
            <span className="text-sm font-semibold text-[#111827]">PM Platform</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#111827] flex items-center justify-center text-white text-xs font-medium">
                {user?.email?.[0]?.toUpperCase()}
              </div>
              <span className="text-[13px] text-[#111827]">{user?.email}</span>
            </div>
            <button onClick={handleLogout}
              className="px-3 py-1.5 border border-[#e5e7eb] text-[#6b7280] hover:text-[#111827] hover:border-[#111827] text-[13px] font-medium rounded-lg transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-8">
          <h1 className="text-xl font-semibold text-[#111827]">Welcome back</h1>
          {user?.verified && (
            <span className="px-2.5 py-1 bg-[#f0fdf4] border border-[#bbf7d0] text-[#15803d] text-xs font-medium rounded-full">
              Verified
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-[#e5e7eb] rounded-xl shadow-sm p-6">
            <h2 className="text-sm font-semibold text-[#111827] mb-4">Account</h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-[#9ca3af] mb-1">Email</p>
                <p className="text-[13px] text-[#111827]">{user?.email}</p>
              </div>
              <div>
                <p className="text-xs text-[#9ca3af] mb-1">User ID</p>
                <p className="text-[13px] text-[#111827] font-mono truncate">{user?.id}</p>
              </div>
              <div>
                <p className="text-xs text-[#9ca3af] mb-1">Account created</p>
                <p className="text-[13px] text-[#111827]">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleString() : '—'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#e5e7eb] rounded-xl shadow-sm p-6">
            <h2 className="text-sm font-semibold text-[#111827] mb-4">Session</h2>
            <div className="space-y-2.5">
              <div className="flex justify-between text-[13px]">
                <span className="text-[#6b7280]">Cookie name</span>
                <span className="font-mono text-[#111827]">auth_token</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[#6b7280]">HttpOnly</span>
                <span className="text-[#15803d] font-medium">true</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[#6b7280]">SameSite</span>
                <span className="text-[#111827]">Lax</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[#6b7280]">Secure</span>
                <span className="text-[#111827]">production only</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[#6b7280]">Expiry</span>
                <span className="text-[#111827]">7 days</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
