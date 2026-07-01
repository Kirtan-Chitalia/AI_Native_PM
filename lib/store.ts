// In-memory store (replace with DB in production)
export interface User {
  id: string
  email: string
  passwordHash: string
  verified: boolean
  createdAt: Date
}

export interface OTPRecord {
  email: string
  otp: string
  expiresAt: Date
  attempts: number
}

// Singleton maps (persists during server runtime)
export const users = new Map<string, User>()        // email -> User
export const otpStore = new Map<string, OTPRecord>() // email -> OTPRecord
