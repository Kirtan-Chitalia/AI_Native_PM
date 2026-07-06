import { NextRequest, NextResponse } from 'next/server'
import { otpStore } from '@/lib/store'
import { getUserByEmail, query } from '@/lib/db'
import { signToken, setAuthCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json()

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 })
    }

    const record = otpStore.get(email.toLowerCase())

    if (!record) {
      return NextResponse.json({ error: 'OTP not found. Request a new one.' }, { status: 404 })
    }

    // Check expiry
    if (new Date() > record.expiresAt) {
      otpStore.delete(email.toLowerCase())
      return NextResponse.json({ error: 'OTP expired. Request a new one.' }, { status: 410 })
    }

    // Rate-limit attempts
    if (record.attempts >= 5) {
      otpStore.delete(email.toLowerCase())
      return NextResponse.json({ error: 'Too many attempts. Request a new OTP.' }, { status: 429 })
    }

    if (record.otp !== otp.toString()) {
      record.attempts += 1
      otpStore.set(email.toLowerCase(), record)
      const remaining = 5 - record.attempts
      return NextResponse.json({
        error: `Incorrect OTP. ${remaining} attempt(s) left.`
      }, { status: 400 })
    }

    // OTP valid — mark user as verified
    const user = await getUserByEmail(email.toLowerCase())
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    await query('UPDATE users SET email_verified = TRUE WHERE id = $1', [user.id])
    user.verified = true
    otpStore.delete(email.toLowerCase())

    // Issue JWT and set HTTP-only cookie
    const token = signToken({ userId: user.id, email: user.email })
    const res = NextResponse.json({ message: 'Email verified. You are now logged in.' })
    setAuthCookie(res, token)

    return res

  } catch (error) {
    console.error('OTP verify error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
