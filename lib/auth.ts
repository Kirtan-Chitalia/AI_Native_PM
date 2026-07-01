import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-dev-key-change-in-prod'
const COOKIE_NAME = 'auth_token'

// ─── JWT ────────────────────────────────────────────────────────────────────

export function signToken(payload: { userId: string; email: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string }
  } catch {
    return null
  }
}

// ─── Cookie helpers ──────────────────────────────────────────────────────────

export function setAuthCookie(res: NextResponse, token: string) {
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,       // JS cannot read this — XSS protection
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',      // CSRF protection
    maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
    path: '/',
  })
}

export function clearAuthCookie(res: NextResponse) {
  res.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
}

export async function getAuthToken() {
  const cookieStore = await cookies()
  return cookieStore.get(COOKIE_NAME)?.value ?? null
}

// ─── Password validation ─────────────────────────────────────────────────────

export interface PasswordStrength {
  score: number       // 0-4
  label: string
  errors: string[]
  color: string
}

export function checkPasswordStrength(password: string): PasswordStrength {
  const errors: string[] = []

  if (password.length < 8)         errors.push('At least 8 characters required')
  if (!/[A-Z]/.test(password))     errors.push('At least one uppercase letter')
  if (!/[a-z]/.test(password))     errors.push('At least one lowercase letter')
  if (!/[0-9]/.test(password))     errors.push('At least one number')
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password))
                                   errors.push('At least one special character')

  const score = Math.max(0, 5 - errors.length) - 1 // 0-4

  const labels = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong']
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a']

  return {
    score: Math.max(0, score),
    label: labels[Math.max(0, score)],
    errors,
    color: colors[Math.max(0, score)],
  }
}

// ─── OTP generator ───────────────────────────────────────────────────────────

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}
