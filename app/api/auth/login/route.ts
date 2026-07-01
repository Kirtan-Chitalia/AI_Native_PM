import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { users } from '@/lib/store'
import { signToken, setAuthCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const user = users.get(email.toLowerCase())

    if (!user) {
      // Generic message to prevent user enumeration
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    if (!user.verified) {
      return NextResponse.json({
        error: 'Email not verified. Please complete OTP verification.',
        needsVerification: true,
        email: user.email,
      }, { status: 403 })
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash)
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // Issue JWT and set HTTP-only cookie 🍪
    const token = signToken({ userId: user.id, email: user.email })
    const res = NextResponse.json({
      message: 'Login successful',
      user: { id: user.id, email: user.email },
    })
    setAuthCookie(res, token)

    return res

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
