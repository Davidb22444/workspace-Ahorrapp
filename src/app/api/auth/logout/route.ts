import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, TOKEN_NAME } from '@/lib/jwt'
import { revokeToken } from '@/lib/session-store'

export async function POST(request: NextRequest) {
  const token = request.cookies.get(TOKEN_NAME)?.value
  const refreshToken = request.cookies.get('refresh_token')?.value

  if (token) {
    try {
      const payload = verifyToken(token)
      revokeToken(payload.jti, payload.exp! * 1000)
    } catch {
    }
  }

  if (refreshToken) {
    try {
      const payload = verifyToken(refreshToken)
      revokeToken(payload.jti, payload.exp! * 1000)
    } catch {
    }
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set(TOKEN_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  })
  response.cookies.set('refresh_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  })
  return response
}
