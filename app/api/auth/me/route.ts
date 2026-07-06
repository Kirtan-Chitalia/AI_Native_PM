import { NextResponse } from 'next/server'
import { getAuthToken, verifyToken } from '@/lib/auth'
import { getUserByEmail } from '@/lib/db'

export async function GET() {
  const token = await getAuthToken()

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const payload = verifyToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 })
  }

  const user = await getUserByEmail(payload.email)
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      verified: user.verified,
      createdAt: user.createdAt,
      role: user.role,
      profileRole: user.profileRole,
      mustChangePassword: user.mustChangePassword,
      totpEnabled: user.totpEnabled,
    }
  })
}
