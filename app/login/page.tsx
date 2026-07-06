'use client'

import { Suspense, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { checkPasswordStrength } from '@/lib/password'

type Mode = 'login' | 'otp' | 'totp' | 'change-password'

function CheckIcon({ met }: { met: boolean }) {
  return (
    <span
      className={`flex items-center justify-center w-4 h-4 rounded border shrink-0 ${
        met ? 'bg-[#16a34a] border-[#16a34a]' : 'bg-white border-[#E5E7EB] dark:border-[#2A2A2A]'
      }`}
    >
      {met && (
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
          <path d="M3 8.5L6.5 12L13 4.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthPageInner />
    </Suspense>
  )
}

function AuthPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialMode = searchParams.get('mode') === 'change-password' ? 'change-password' : 'login'
  const [mode, setMode] = useState<Mode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [totpCode, setTotpCode] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  // Change-password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])
  const totpRefs = useRef<(HTMLInputElement | null)[]>([])

  const newPwStrength = newPassword ? checkPasswordStrength(newPassword) : null
  const newPwRequirements = [
    { label: 'At least 8 characters', met: newPassword.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(newPassword) },
    { label: 'One lowercase letter', met: /[a-z]/.test(newPassword) },
    { label: 'One number', met: /[0-9]/.test(newPassword) },
    { label: 'One special character', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword) },
  ]

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
      } else if (data.needsTotp) {
        setTotpCode(['', '', '', '', '', ''])
        setMode('totp')
      } else {
        // Check if user must change password
        const meRes = await fetch('/api/auth/me')
        const meData = await meRes.json()
        if (meData.user?.mustChangePassword) {
          setCurrentPassword(password)
          setNewPassword('')
          setMode('change-password')
          setSuccess('')
        } else {
          setSuccess('Login successful! Redirecting...')
          setTimeout(() => router.push('/dashboard'), 1000)
        }
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
      if (!res.ok) setError(data.error)
      else {
        const meRes = await fetch('/api/auth/me')
        const meData = await meRes.json()
        if (meData.user?.mustChangePassword) {
          setCurrentPassword('')
          setNewPassword('')
          setMode('change-password')
        } else {
          setSuccess('Login successful! Redirecting...')
          setTimeout(() => router.push('/dashboard'), 1000)
        }
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

  const handleChangePassword = async () => {
    clearMessages()
    if (!newPassword) { setError('Please enter your new password'); return }
    if (!confirmPassword) { setError('Please confirm your new password'); return }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return }
    const s = checkPasswordStrength(newPassword)
    if (s.score < 3) { setError('Password too weak: ' + s.errors.join(', ')); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error)
      else {
        setSuccess('Password set! Redirecting to your dashboard...')
        setTimeout(() => router.push('/dashboard'), 1200)
      }
    } catch { setError('Network error. Please try again.') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#F8F8F8] dark:bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="w-11 h-11 rounded-lg bg-[#E5002B] flex items-center justify-center text-white text-sm font-semibold">
            TL
          </div>
          <h1 className="mt-3 text-lg font-semibold text-[#0A0A0A] dark:text-white">Tasklynx</h1>
          <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF]">Enterprise project management, simplified</p>
        </div>

        <div className="bg-white dark:bg-[#1A1A1A] border border-[#E5E7EB] dark:border-[#2A2A2A] rounded-xl shadow-sm p-8">

          {/* Login header */}
          {mode === 'login' && (
            <div className="mb-7">
              <h2 className="text-base font-semibold text-[#0A0A0A] dark:text-white">Sign in to your account</h2>
              <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
                Enter your credentials to continue
              </p>
            </div>
          )}

          {/* TOTP header */}
          {mode === 'totp' && (
            <div className="text-center mb-7">
              <h2 className="text-lg font-semibold text-[#0A0A0A] dark:text-white mb-1">Two-factor authentication</h2>
              <p className="text-[#6B7280] dark:text-[#9CA3AF] text-[13px]">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>
          )}

          {/* OTP header */}
          {mode === 'otp' && (
            <div className="text-center mb-7">
              <h2 className="text-lg font-semibold text-[#0A0A0A] dark:text-white mb-1">Verify your email</h2>
              <p className="text-[#6B7280] dark:text-[#9CA3AF] text-[13px]">
                Enter the 6-digit code sent to<br />
                <span className="text-[#0A0A0A] dark:text-white font-medium">{email}</span>
              </p>
            </div>
          )}

          {/* Change password header */}
          {mode === 'change-password' && (
            <div className="mb-6">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-full bg-[#FEF3C7] dark:bg-[#2a1f00] flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <h2 className="text-base font-semibold text-[#0A0A0A] dark:text-white">Set your new password</h2>
              </div>
              <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF]">
                Your account was created by an administrator. Please set a personal password before continuing.
              </p>
            </div>
          )}

          {/* Error / Success banners */}
          {error && (
            <div className="mb-4 px-4 py-3 bg-[#fef2f2] border border-[#fecaca] rounded-lg">
              <p className="text-[#b91c1c] text-[13px]">{error}</p>
            </div>
          )}
          {success && (
            <div className="mb-4 px-4 py-3 bg-[#f0fdf4] border border-[#bbf7d0] rounded-lg">
              <p className="text-[#15803d] text-[13px]">{success}</p>
            </div>
          )}

          {/* Login form */}
          {mode === 'login' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#0A0A0A] dark:text-white mb-1.5">Email</label>
                <input type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  placeholder="you@company.com"
                  className="w-full px-3 py-2.5 bg-white dark:bg-[#141414] border border-[#E5E7EB] dark:border-[#2A2A2A] rounded-lg text-[#0A0A0A] dark:text-white placeholder-[#9CA3AF] text-[13px] focus:outline-none focus:border-[#E5002B] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#0A0A0A] dark:text-white mb-1.5">Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    placeholder="Your password"
                    className="w-full px-3 py-2.5 pr-14 bg-white dark:bg-[#141414] border border-[#E5E7EB] dark:border-[#2A2A2A] rounded-lg text-[#0A0A0A] dark:text-white placeholder-[#9CA3AF] text-[13px] focus:outline-none focus:border-[#E5002B] transition-colors"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#0A0A0A] dark:hover:text-white text-xs font-medium">
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <button onClick={handleLogin}
                disabled={loading}
                className="w-full py-2.5 mt-2 bg-[#E5002B] hover:bg-[#CC0025] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors text-[13px]">
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          )}

          {/* OTP verification */}
          {mode === 'otp' && (
            <div>
              <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
                {otp.map((digit, i) => (
                  <input key={i} ref={(el) => { otpRefs.current[i] = el }}
                    type="text" inputMode="numeric" maxLength={1} value={digit}
                    onChange={(e) => handleOTPInput(i, e.target.value)}
                    onKeyDown={(e) => handleOTPKeyDown(i, e)}
                    className={`w-11 h-13 py-2.5 text-center text-lg font-semibold bg-white dark:bg-[#141414] border rounded-lg text-[#0A0A0A] dark:text-white transition-colors focus:outline-none ${
                      digit ? 'border-[#E5002B]' : 'border-[#E5E7EB] dark:border-[#2A2A2A] focus:border-[#E5002B]'
                    }`}
                  />
                ))}
              </div>
              <button onClick={handleVerifyOTP}
                disabled={loading || otp.join('').length < 6}
                className="w-full py-2.5 bg-[#E5002B] hover:bg-[#CC0025] disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors text-[13px]">
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
              <button onClick={() => { setMode('login'); clearMessages(); setOtp(['','','','','','']) }}
                className="w-full mt-3 py-2 text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#0A0A0A] dark:hover:text-white text-[13px] transition-colors">
                Back to login
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
                    className={`w-11 h-13 py-2.5 text-center text-lg font-semibold bg-white dark:bg-[#141414] border rounded-lg text-[#0A0A0A] dark:text-white transition-colors focus:outline-none ${
                      digit ? 'border-[#E5002B]' : 'border-[#E5E7EB] dark:border-[#2A2A2A] focus:border-[#E5002B]'
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
                className="w-full mt-3 py-2 text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#0A0A0A] dark:hover:text-white text-[13px] transition-colors">
                Back to login
              </button>
            </div>
          )}

          {/* Force password change */}
          {mode === 'change-password' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#0A0A0A] dark:text-white mb-1.5">New password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleChangePassword()}
                    placeholder="Create a strong password"
                    className="w-full px-3 py-2.5 pr-14 bg-white dark:bg-[#141414] border border-[#E5E7EB] dark:border-[#2A2A2A] rounded-lg text-[#0A0A0A] dark:text-white placeholder-[#9CA3AF] text-[13px] focus:outline-none focus:border-[#E5002B] transition-colors"
                  />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#0A0A0A] dark:hover:text-white text-xs font-medium">
                    {showNewPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {newPassword.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {newPwRequirements.map((r) => (
                      <div key={r.label} className="flex items-center gap-2">
                        <CheckIcon met={r.met} />
                        <span className={`text-xs ${r.met ? 'text-[#0A0A0A] dark:text-white' : 'text-[#9CA3AF]'}`}>
                          {r.label}
                        </span>
                      </div>
                    ))}
                    {newPwStrength && (
                      <div className="flex items-center gap-2 pt-1">
                        <div className="flex gap-1 flex-1">
                          {[0, 1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                              style={{ backgroundColor: i <= newPwStrength.score ? newPwStrength.color : '#e5e7eb' }} />
                          ))}
                        </div>
                        <span className="text-xs font-medium" style={{ color: newPwStrength.color }}>{newPwStrength.label}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-[13px] font-medium text-[#0A0A0A] dark:text-white mb-1.5">Confirm new password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleChangePassword()}
                    placeholder="Re-enter your new password"
                    className={`w-full px-3 py-2.5 pr-14 bg-white dark:bg-[#141414] border rounded-lg text-[#0A0A0A] dark:text-white placeholder-[#9CA3AF] text-[13px] focus:outline-none transition-colors ${
                      confirmPassword.length > 0
                        ? newPassword === confirmPassword
                          ? 'border-[#22C55E] focus:border-[#22C55E]'
                          : 'border-[#E5002B] focus:border-[#E5002B]'
                        : 'border-[#E5E7EB] dark:border-[#2A2A2A] focus:border-[#E5002B]'
                    }`}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#0A0A0A] dark:hover:text-white text-xs font-medium">
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {/* Live match indicator */}
                {confirmPassword.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2">
                    {newPassword === confirmPassword ? (
                      <>
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                          <path d="M3 8.5L6.5 12L13 4.5" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-[12px] text-[#22C55E] font-medium">Passwords match</span>
                      </>
                    ) : (
                      <>
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                          <line x1="4" y1="4" x2="12" y2="12" stroke="#E5002B" strokeWidth="2" strokeLinecap="round" />
                          <line x1="12" y1="4" x2="4" y2="12" stroke="#E5002B" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <span className="text-[12px] text-[#E5002B] font-medium">Passwords do not match</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <button onClick={handleChangePassword}
                disabled={loading || (confirmPassword.length > 0 && newPassword !== confirmPassword)}
                className="w-full py-2.5 bg-[#E5002B] hover:bg-[#CC0025] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors text-[13px]">
                {loading ? 'Saving...' : 'Set password & continue'}
              </button>
            </div>
          )}
        </div>

        {/* Admin portal link */}
        <p className="mt-5 text-center text-[#9CA3AF] text-xs">
          Secured with HTTP-only session cookies
        </p>
        <p className="mt-2 text-center">
          <Link
            href="/admin-login"
            className="inline-flex items-center gap-1.5 text-[12px] text-[#6B7280] dark:text-[#6B7280] hover:text-[#E5002B] dark:hover:text-[#E5002B] transition-colors group"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Administrator? Access the admin portal
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
        </p>
      </div>
    </div>
  )
}
