'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

type Mode = 'login' | 'signup' | 'otp'

interface PasswordStrength {
  score: number
  label: string
  color: string
  errors: string[]
}

function checkStrength(password: string): PasswordStrength {
  const errors: string[] = []
  if (password.length < 8)        errors.push('At least 8 characters')
  if (!/[A-Z]/.test(password))    errors.push('One uppercase letter')
  if (!/[a-z]/.test(password))    errors.push('One lowercase letter')
  if (!/[0-9]/.test(password))    errors.push('One number')
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password))
                                  errors.push('One special character')
  const score = Math.max(0, 4 - errors.length)
  const labels = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong']
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a']
  return { score, label: labels[score], color: colors[score], errors }
}

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [devOTP, setDevOTP] = useState('')
  const [strength, setStrength] = useState<PasswordStrength | null>(null)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (password && mode === 'signup') setStrength(checkStrength(password))
    else setStrength(null)
  }, [password, mode])

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
        if (data.needsVerification) {
          setSuccess('Email not verified. Check your inbox for OTP.')
          setTimeout(() => setMode('otp'), 1500)
        } else setError(data.error)
      } else {
        setSuccess('Login successful! Redirecting...')
        setTimeout(() => router.push('/dashboard'), 1000)
      }
    } catch { setError('Network error. Please try again.') }
    finally { setLoading(false) }
  }

  const handleSignup = async () => {
    clearMessages()
    const s = checkStrength(password)
    if (s.score < 3) { setError('Password too weak: ' + s.errors.join(', ')); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error + (data.details ? ': ' + data.details.join(', ') : ''))
      else {
        setDevOTP(data.devOTP || '')
        setSuccess(data.message)
        setTimeout(() => setMode('otp'), 1200)
      }
    } catch { setError('Network error. Please try again.') }
    finally { setLoading(false) }
  }

  const handleOTPInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const next = [...otp]
    next[index] = value.slice(-1)
    setOtp(next)
    if (value && index < 5) otpRefs.current[index + 1]?.focus()
  }

  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0)
      otpRefs.current[index - 1]?.focus()
  }

  const handleVerifyOTP = async () => {
    const otpValue = otp.join('')
    if (otpValue.length < 6) { setError('Enter all 6 digits'); return }
    clearMessages(); setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otpValue }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error)
      else {
        setSuccess('Email verified! Redirecting...')
        setTimeout(() => router.push('/dashboard'), 1200)
      }
    } catch { setError('Network error. Please try again.') }
    finally { setLoading(false) }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) { setOtp(pasted.split('')); otpRefs.current[5]?.focus() }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full opacity-10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full opacity-10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl">

          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xl font-bold shadow-lg">
              A
            </div>
          </div>

          {mode !== 'otp' && (
            <div className="flex bg-slate-900/50 rounded-xl p-1 mb-8 border border-slate-700/30">
              {(['login', 'signup'] as const).map((m) => (
                <button key={m}
                  onClick={() => { setMode(m); clearMessages(); setPassword(''); setStrength(null) }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    mode === m
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {m === 'login' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>
          )}

          {mode === 'otp' && (
            <div className="text-center mb-8">
              <h2 className="text-xl font-semibold text-white mb-1">Verify your email</h2>
              <p className="text-slate-400 text-sm">
                Enter the 6-digit code sent to<br />
                <span className="text-purple-400 font-medium">{email}</span>
              </p>
              {devOTP && (
                <div className="mt-3 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <p className="text-amber-400 text-xs">
                    Dev mode OTP: <span className="font-mono font-bold text-sm">{devOTP}</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          {success && (
            <div className="mb-4 px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-xl">
              <p className="text-green-400 text-sm">{success}</p>
            </div>
          )}

          {mode !== 'otp' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Email</label>
                <input type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (mode === 'login' ? handleLogin() : handleSignup())}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 bg-slate-900/60 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500/70 focus:ring-2 focus:ring-purple-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (mode === 'login' ? handleLogin() : handleSignup())}
                    placeholder={mode === 'signup' ? 'Min 8 chars, mixed case + symbol' : 'Your password'}
                    className="w-full px-4 py-3 pr-11 bg-slate-900/60 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500/70 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs">
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>

                {mode === 'signup' && strength && password.length > 0 && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                          style={{ backgroundColor: i <= strength.score ? strength.color : '#334155' }} />
                      ))}
                    </div>
                    <p className="text-xs" style={{ color: strength.color }}>{strength.label}</p>
                    {strength.errors.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {strength.errors.map((err) => (
                          <li key={err} className="text-xs text-slate-500 flex items-center gap-1">
                            <span className="text-red-400">×</span> {err}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              <button onClick={mode === 'login' ? handleLogin : handleSignup}
                disabled={loading}
                className="w-full py-3 mt-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all duration-200 text-sm shadow-lg shadow-purple-900/30 active:scale-[0.98]">
                {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account & get OTP'}
              </button>
            </div>
          )}

          {mode === 'otp' && (
            <div>
              <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
                {otp.map((digit, i) => (
                  <input key={i} ref={(el) => { otpRefs.current[i] = el }}
                    type="text" inputMode="numeric" maxLength={1} value={digit}
                    onChange={(e) => handleOTPInput(i, e.target.value)}
                    onKeyDown={(e) => handleOTPKeyDown(i, e)}
                    className={`w-12 h-14 text-center text-xl font-semibold bg-slate-900/60 border rounded-xl text-white transition-all focus:outline-none ${
                      digit ? 'border-purple-500/70 ring-2 ring-purple-500/20' : 'border-slate-700/50 focus:border-purple-500/70 focus:ring-2 focus:ring-purple-500/20'
                    }`}
                  />
                ))}
              </div>
              <button onClick={handleVerifyOTP}
                disabled={loading || otp.join('').length < 6}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all duration-200 text-sm shadow-lg shadow-purple-900/30 active:scale-[0.98]">
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
              <button onClick={() => { setMode('login'); clearMessages(); setOtp(['','','','','','']) }}
                className="w-full mt-3 py-2 text-slate-400 hover:text-slate-200 text-sm transition-colors">
                ← Back to login
              </button>
            </div>
          )}

          <p className="mt-6 text-center text-slate-600 text-xs">
            🍪 Secure HTTP-only cookie session
          </p>
        </div>
      </div>
    </div>
  )
}
