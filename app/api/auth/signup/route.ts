import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { users, otpStore } from '@/lib/store'
import { checkPasswordStrength, generateOTP } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    // Basic validation
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    if (users.has(email.toLowerCase())) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    // Password strength check
    const strength = checkPasswordStrength(password)
    if (strength.score < 3) {
      return NextResponse.json({
        error: 'Password is too weak',
        details: strength.errors,
      }, { status: 400 })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Store user (unverified)
    const userId = uuidv4()
    users.set(email.toLowerCase(), {
      id: userId,
      email: email.toLowerCase(),
      passwordHash,
      verified: false,
      createdAt: new Date(),
    })

    // Generate OTP (6 digits, 10 min expiry)
    const otp = generateOTP()
    otpStore.set(email.toLowerCase(), {
      email: email.toLowerCase(),
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0,
    })

    // In production: send email via nodemailer/sendgrid
    // For dev: return OTP in response so you can test
    console.log(`\n📧 OTP for ${email}: ${otp}\n`)

    return NextResponse.json({
      message: 'Account created. Check your email for the OTP.',
      // Remove this in production!
      devOTP: process.env.NODE_ENV !== 'production' ? otp : undefined,
    }, { status: 201 })

  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
