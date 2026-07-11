'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import AppShell from '@/components/AppShell'
import Skeleton from '@/components/Skeleton'
import { checkPasswordStrength } from '@/lib/password'

interface OrgUser {
  id: string
  email: string
  display_name: string
  role: string
  profileRole: 'admin' | 'project_manager' | 'developer'
  mustChangePassword: boolean
  created_at: string
}

const PROFILE_ROLE_CONFIG = {
  admin: {
    label: 'Admin',
    bg: 'bg-[#FEF2F2] dark:bg-[#2a1010]',
    text: 'text-[#E5002B] dark:text-[#f87171]',
    border: 'border-[#fecaca] dark:border-[#991b1b]',
    dot: 'bg-[#E5002B]',
  },
  project_manager: {
    label: 'Project Manager',
    bg: 'bg-[#FEFCE8] dark:bg-[#2a1f00]',
    text: 'text-[#b45309] dark:text-[#fbbf24]',
    border: 'border-[#fde68a] dark:border-[#92400e]',
    dot: 'bg-[#F59E0B]',
  },
  developer: {
    label: 'Developer',
    bg: 'bg-[#F0FDF4] dark:bg-[#0f2a17]',
    text: 'text-[#15803D] dark:text-[#4ade80]',
    border: 'border-[#bbf7d0] dark:border-[#166534]',
    dot: 'bg-[#22C55E]',
  },
}

function RoleBadge({ role }: { role: 'admin' | 'project_manager' | 'developer' }) {
  const cfg = PROFILE_ROLE_CONFIG[role]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function CheckIcon({ met }: { met: boolean }) {
  return (
    <span className={`flex items-center justify-center w-4 h-4 rounded border shrink-0 ${met ? 'bg-[#16a34a] border-[#16a34a]' : 'bg-white dark:bg-transparent border-[#E5E7EB] dark:border-[#2A2A2A]'}`}>
      {met && (
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
          <path d="M3 8.5L6.5 12L13 4.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  )
}

export default function UsersPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [userRole, setUserRole] = useState('')
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<OrgUser[]>([])
  const [showModal, setShowModal] = useState(false)

  // Create user form state
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [newRole, setNewRole] = useState<'admin' | 'project_manager' | 'developer'>('developer')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [lastCreated, setLastCreated] = useState<{ email: string; password: string; profileRole: string } | null>(null)

  const strength = newPassword ? checkPasswordStrength(newPassword) : null
  const requirements = [
    { label: 'At least 8 characters', met: newPassword.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(newPassword) },
    { label: 'One lowercase letter', met: /[a-z]/.test(newPassword) },
    { label: 'One number', met: /[0-9]/.test(newPassword) },
    { label: 'One special character', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword) },
  ]

  const loadUsers = useCallback(async () => {
    const res = await fetch('/api/admin/users')
    if (!res.ok) return
    const data = await res.json()
    setUsers(data.users || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((data) => {
        if (data.user?.role !== 'admin') {
          router.push('/dashboard')
          return
        }
        setEmail(data.user.email)
        setUserRole(data.user.role)
        loadUsers()
      })
      .catch(() => router.push('/login'))
  }, [router, loadUsers])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const handleCreate = async () => {
    setCreateError('')
    if (!newEmail.trim()) { setCreateError('Email is required'); return }
    if (!newPassword) { setCreateError('Temporary password is required'); return }
    if (strength && strength.score < 3) { setCreateError('Password too weak'); return }

    setCreating(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, password: newPassword, profileRole: newRole }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCreateError(data.error)
        return
      }
      toast.success('User created successfully')
      setLastCreated({ email: newEmail, password: newPassword, profileRole: newRole })
      setNewEmail('')
      setNewPassword('')
      setNewRole('developer')
      setShowModal(false)
      loadUsers()
    } catch {
      setCreateError('Network error. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <AppShell active="users" pageTitle="User Management" email={email} onLogout={handleLogout}>
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-[#0A0A0A] dark:text-white">User Management</h1>
            <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
              Create and manage user accounts for your organisation
            </p>
          </div>
          <button
            onClick={() => { setShowModal(true); setCreateError(''); setLastCreated(null) }}
            className="flex items-center gap-2 px-4 py-2 bg-[#E5002B] hover:bg-[#CC0025] active:scale-[0.98] text-white text-[13px] font-medium rounded-lg transition-all duration-150"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Create User
          </button>
        </div>

        {/* Last created credentials banner */}
        {lastCreated && (
          <div className="mb-6 p-4 bg-[#FEFCE8] dark:bg-[#1a1500] border border-[#FDE68A] dark:border-[#92400e] rounded-xl">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#FEF3C7] dark:bg-[#2a1f00] flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#92400e] dark:text-[#fbbf24] mb-1">Share these credentials with the user</p>
                <div className="space-y-1 text-[13px] text-[#78350f] dark:text-[#d97706]">
                  <div>Email: <span className="font-mono font-medium">{lastCreated.email}</span></div>
                  <div className="flex items-center gap-2">
                    <span>Temp password: <span className="font-mono font-medium">{lastCreated.password}</span></span>
                    <button
                      onClick={() => { navigator.clipboard.writeText(lastCreated.password); toast.success('Password copied') }}
                      className="text-[11px] px-2 py-0.5 rounded border border-[#fde68a] dark:border-[#92400e] hover:bg-[#fef3c7] dark:hover:bg-[#2a1f00] transition-colors"
                    >Copy</button>
                  </div>
                  <div>Role: <RoleBadge role={lastCreated.profileRole as 'admin' | 'project_manager' | 'developer'} /></div>
                </div>
                <p className="text-[11px] text-[#92400e]/70 dark:text-[#fbbf24]/50 mt-2">They will be prompted to change their password on first login.</p>
              </div>
              <button onClick={() => setLastCreated(null)} className="text-[#92400e] dark:text-[#fbbf24] hover:opacity-70 shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Users table */}
        <div className="bg-white dark:bg-[#1A1A1A] border border-[#E5E7EB] dark:border-[#2A2A2A] rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E5E7EB] dark:border-[#2A2A2A] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#0A0A0A] dark:text-white">
              Organisation Members
            </h2>
            {!loading && (
              <span className="text-[12px] text-[#9CA3AF]">{users.length} {users.length === 1 ? 'member' : 'members'}</span>
            )}
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : users.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF]">No users yet. Create the first one above.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F3F4F6] dark:divide-[#2A2A2A]">
              {users.map((u) => (
                <div key={u.id} className="flex items-center gap-4 px-6 py-4 hover:bg-[#F9F9F9] dark:hover:bg-[#1F1F1F] transition-colors">
                  <div className="w-9 h-9 rounded-full bg-[#E5002B]/10 dark:bg-[#E5002B]/20 text-[#E5002B] text-sm font-medium flex items-center justify-center shrink-0">
                    {(u.display_name || u.email)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#0A0A0A] dark:text-white truncate">{u.display_name || u.email.split('@')[0]}</p>
                    <p className="text-[12px] text-[#6B7280] dark:text-[#9CA3AF] truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <RoleBadge role={u.profileRole} />
                    {u.mustChangePassword && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#F3F4F6] dark:bg-[#242424] text-[#6B7280] dark:text-[#9CA3AF] border border-[#E5E7EB] dark:border-[#2A2A2A]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                        Awaiting login
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#9CA3AF] shrink-0 hidden sm:block">
                    {new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create user modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#1A1A1A] border border-[#E5E7EB] dark:border-[#2A2A2A] rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] dark:border-[#2A2A2A]">
              <h2 className="text-base font-semibold text-[#0A0A0A] dark:text-white">Create New User</h2>
              <button onClick={() => setShowModal(false)} className="text-[#9CA3AF] hover:text-[#0A0A0A] dark:hover:text-white transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {createError && (
                <div className="px-4 py-3 bg-[#fef2f2] border border-[#fecaca] rounded-lg">
                  <p className="text-[#b91c1c] text-[13px]">{createError}</p>
                </div>
              )}

              <div>
                <label className="block text-[13px] font-medium text-[#0A0A0A] dark:text-white mb-1.5">Email address</label>
                <input
                  type="email" value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="user@company.com"
                  className="w-full px-3 py-2.5 bg-white dark:bg-[#141414] border border-[#E5E7EB] dark:border-[#2A2A2A] rounded-lg text-[#0A0A0A] dark:text-white placeholder-[#9CA3AF] text-[13px] focus:outline-none focus:border-[#E5002B] transition-colors"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#0A0A0A] dark:text-white mb-1.5">Temporary password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'} value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Set a strong temporary password"
                    className="w-full px-3 py-2.5 pr-14 bg-white dark:bg-[#141414] border border-[#E5E7EB] dark:border-[#2A2A2A] rounded-lg text-[#0A0A0A] dark:text-white placeholder-[#9CA3AF] text-[13px] focus:outline-none focus:border-[#E5002B] transition-colors"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#0A0A0A] dark:hover:text-white text-xs font-medium">
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {newPassword.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {requirements.map((r) => (
                      <div key={r.label} className="flex items-center gap-2">
                        <CheckIcon met={r.met} />
                        <span className={`text-[11px] ${r.met ? 'text-[#0A0A0A] dark:text-white' : 'text-[#9CA3AF]'}`}>{r.label}</span>
                      </div>
                    ))}
                    {strength && (
                      <div className="flex items-center gap-2 pt-1">
                        <div className="flex gap-1 flex-1">
                          {[0, 1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                              style={{ backgroundColor: i <= strength.score ? strength.color : '#e5e7eb' }} />
                          ))}
                        </div>
                        <span className="text-[11px] font-medium" style={{ color: strength.color }}>{strength.label}</span>
                      </div>
                    )}
                  </div>
                )}
                <p className="text-[11px] text-[#9CA3AF] mt-1.5">User will be prompted to change this on first login.</p>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#0A0A0A] dark:text-white mb-2">Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['developer', 'project_manager', 'admin'] as const).map((r) => {
                    const cfg = PROFILE_ROLE_CONFIG[r]
                    return (
                      <button
                        key={r}
                        onClick={() => setNewRole(r)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all duration-150 ${
                          newRole === r
                            ? `${cfg.border} ${cfg.bg}`
                            : 'border-[#E5E7EB] dark:border-[#2A2A2A] hover:border-[#D1D5DB] dark:hover:border-[#3A3A3A]'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                        <span className={`text-[11px] font-medium ${newRole === r ? cfg.text : 'text-[#6B7280] dark:text-[#9CA3AF]'}`}>
                          {cfg.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-2 px-6 pb-6">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 border border-[#E5E7EB] dark:border-[#2A2A2A] text-[#0A0A0A] dark:text-white text-[13px] font-medium rounded-lg hover:border-[#0A0A0A] dark:hover:border-[#525252] transition-colors">
                Cancel
              </button>
              <button onClick={handleCreate} disabled={creating}
                className="flex-1 py-2.5 bg-[#E5002B] hover:bg-[#CC0025] active:scale-[0.98] disabled:opacity-50 text-white text-[13px] font-medium rounded-lg transition-all duration-150">
                {creating ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
