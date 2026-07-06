'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Mode = 'login' | 'totp'

export default function AdminLoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [totpCode, setTotpCode] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const totpRefs = useRef<(HTMLInputElement | null)[]>([])

  const clearMessages = () => { setError(''); setSuccess('') }

  const handleLogin = async () => {
    clearMessages(); setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Login failed')
      } else if (data.needsTotp) {
        setTotpCode(['', '', '', '', '', ''])
        setMode('totp')
      } else {
        // Verify the user is actually an admin
        const meRes = await fetch('/api/auth/me')
        const meData = await meRes.json()
        if (meData.user?.role !== 'admin') {
          // Not an admin — log them out and reject
          await fetch('/api/auth/logout', { method: 'POST' })
          setError('Access denied. This portal is restricted to administrators only.')
          return
        }
        setSuccess('Authentication successful. Entering admin dashboard...')
        setTimeout(() => router.push('/dashboard'), 1000)
      }
    } catch { setError('Network error. Please try again.') }
    finally { setLoading(false) }
  }

  const handleTotpInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const next = [...totpCode]
    next[index] = value.slice(-1)
    setTotpCode(next)
    if (value && index < 5) totpRefs.current[index + 1]?.focus()
  }

  const handleTotpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !totpCode[index] && index > 0)
      totpRefs.current[index - 1]?.focus()
  }

  const handleVerifyTotp = async () => {
    const value = totpCode.join('')
    if (value.length < 6) { setError('Enter all 6 digits'); return }
    clearMessages(); setLoading(true)
    try {
      const res = await fetch('/api/auth/totp/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: value }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error)
      } else {
        const meRes = await fetch('/api/auth/me')
        const meData = await meRes.json()
        if (meData.user?.role !== 'admin') {
          await fetch('/api/auth/logout', { method: 'POST' })
          setError('Access denied. This portal is restricted to administrators only.')
          return
        }
        setSuccess('Authentication successful. Entering admin dashboard...')
        setTimeout(() => router.push('/dashboard'), 1000)
      }
    } catch { setError('Network error. Please try again.') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            {/* Outer glow ring */}
            <div className="absolute inset-0 rounded-2xl bg-[#E5002B]/20 blur-xl scale-150" />
            <div className="relative w-16 h-16 rounded-2xl bg-[#1A1A1A] border border-[#E5002B]/40 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E5002B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
          </div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Administrator Portal</h1>
          <p className="text-[13px] text-[#6B7280] mt-1">Restricted access — authorised personnel only</p>
        </div>

        {/* Card */}
        <div className="bg-[#111111] border border-[#2A2A2A] rounded-2xl shadow-[0_0_0_1px_rgba(229,0,43,0.08),0_24px_48px_rgba(0,0,0,0.6)] p-8">

          {mode === 'totp' && (
            <div className="text-center mb-7">
              <h2 className="text-base font-semibold text-white mb-1">Two-factor authentication</h2>
              <p className="text-[#6B7280] text-[13px]">Enter the 6-digit code from your authenticator app</p>
            </div>
          )}

          {mode === 'login' && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#E5002B] animate-pulse" />
                <span className="text-[11px] text-[#E5002B] font-medium tracking-wide uppercase">Secure Access</span>
              </div>
              <h2 className="text-base font-semibold text-white">Sign in with admin credentials</h2>
            </div>
          )}

          {/* Error / success banners */}
          {error && (
            <div className="mb-4 px-4 py-3 bg-[#1a0a0a] border border-[#E5002B]/40 rounded-lg">
              <div className="flex items-start gap-2.5">
                <svg width="14" height="14" className="mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="#E5002B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p className="text-[#f87171] text-[13px]">{error}</p>
              </div>
            </div>
          )}
          {success && (
            <div className="mb-4 px-4 py-3 bg-[#0a1a0a] border border-[#22c55e]/40 rounded-lg">
              <div className="flex items-center gap-2">
                <svg width="14" height="14" className="shrink-0" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <p className="text-[#4ade80] text-[13px]">{success}</p>
              </div>
            </div>
          )}

          {/* Login form */}
          {mode === 'login' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#D4D4D4] mb-1.5">Admin email</label>
                <input
                  type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  placeholder="admin@company.com"
                  className="w-full px-3 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-[#525252] text-[13px] focus:outline-none focus:border-[#E5002B] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#D4D4D4] mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'} value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    placeholder="Your admin password"
                    className="w-full px-3 py-2.5 pr-14 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-[#525252] text-[13px] focus:outline-none focus:border-[#E5002B] transition-colors"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#525252] hover:text-[#A1A1AA] text-xs font-medium">
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full py-2.5 mt-2 bg-[#E5002B] hover:bg-[#CC0025] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all duration-150 text-[13px] shadow-[0_4px_16px_rgba(229,0,43,0.3)]"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    Authenticating...
                  </span>
                ) : 'Sign in to Admin Portal'}
              </button>
            </div>
          )}

          {/* TOTP verification */}
          {mode === 'totp' && (
            <div>
              <div className="flex justify-center gap-3 mb-6">
                {totpCode.map((digit, i) => (
                  <input key={i} ref={(el) => { totpRefs.current[i] = el }}
                    type="text" inputMode="numeric" maxLength={1} value={digit}
                    onChange={(e) => handleTotpInput(i, e.target.value)}
                    onKeyDown={(e) => handleTotpKeyDown(i, e)}
                    className={`w-11 py-2.5 text-center text-lg font-semibold bg-[#0A0A0A] border rounded-lg text-white transition-colors focus:outline-none ${
                      digit ? 'border-[#E5002B]' : 'border-[#2A2A2A] focus:border-[#E5002B]'
                    }`}
                  />
                ))}
              </div>
              <button onClick={handleVerifyTotp}
                disabled={loading || totpCode.join('').length < 6}
                className="w-full py-2.5 bg-[#E5002B] hover:bg-[#CC0025] disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors text-[13px]">
                {loading ? 'Verifying...' : 'Verify code'}
              </button>
              <button onClick={() => { setMode('login'); clearMessages(); setTotpCode(['','','','','','']) }}
                className="w-full mt-3 py-2 text-[#6B7280] hover:text-white text-[13px] transition-colors">
                ← Back
              </button>
            </div>
          )}
        </div>

        {/* Footer link */}
        <p className="mt-6 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-[12px] text-[#525252] hover:text-[#A1A1AA] transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to regular login
          </Link>
        </p>
      </div>
    </div>
  )
}
