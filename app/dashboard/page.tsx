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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full opacity-10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full opacity-10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl">

          {/* Avatar */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg mb-4">
              {user?.email?.[0]?.toUpperCase()}
            </div>
            <h1 className="text-xl font-semibold text-white">Welcome back!</h1>
            <p className="text-slate-400 text-sm mt-1">{user?.email}</p>
            <span className="mt-2 px-3 py-1 bg-green-500/10 border border-green-500/30 text-green-400 text-xs rounded-full">
              ✓ Verified
            </span>
          </div>

          {/* Info cards */}
          <div className="space-y-3 mb-8">
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
              <p className="text-slate-500 text-xs mb-1">User ID</p>
              <p className="text-slate-300 text-sm font-mono truncate">{user?.id}</p>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
              <p className="text-slate-500 text-xs mb-1">Account created</p>
              <p className="text-slate-300 text-sm">
                {user?.createdAt ? new Date(user.createdAt).toLocaleString() : '—'}
              </p>
            </div>

            {/* Cookie info */}
            <div className="bg-purple-500/5 rounded-xl p-4 border border-purple-500/20">
              <p className="text-purple-400 text-xs font-medium mb-2">🍪 HTTP Cookie Session</p>
              <div className="space-y-1 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Name</span>
                  <span className="font-mono text-slate-300">auth_token</span>
                </div>
                <div className="flex justify-between">
                  <span>HttpOnly</span>
                  <span className="text-green-400">✓ true</span>
                </div>
                <div className="flex justify-between">
                  <span>SameSite</span>
                  <span className="text-green-400">Lax (CSRF safe)</span>
                </div>
                <div className="flex justify-between">
                  <span>Secure</span>
                  <span className="text-amber-400">production only</span>
                </div>
                <div className="flex justify-between">
                  <span>Expiry</span>
                  <span className="text-slate-300">7 days</span>
                </div>
              </div>
            </div>
          </div>

          <button onClick={handleLogout}
            className="w-full py-3 bg-slate-700/50 hover:bg-red-500/20 border border-slate-600/50 hover:border-red-500/40 text-slate-300 hover:text-red-400 font-medium rounded-xl transition-all duration-200 text-sm">
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
