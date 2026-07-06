import bcrypt from 'bcryptjs'

export interface OTPRecord {
  email: string
  otp: string
  expiresAt: Date
  attempts: number
}

// Singleton maps (persists during server runtime)
export const otpStore = new Map<string, OTPRecord>() // email -> OTPRecord
