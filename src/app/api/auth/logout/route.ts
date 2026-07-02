import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, TOKEN_NAME } from '@/lib/jwt'
import { revokeToken } from '@/lib/session-store'

const expiredCookieDate = new Date(0)

export async function POST(request: NextRequest) {
  const token = request.cookies.get(TOKEN_NAME)?.value
  const refreshToken = request.cookies.get('refresh_token')?.value

  if (token) {
    try {
      const payload = verifyToken(token)
      revokeToken(payload.jti, payload.exp! * 1000)
    } catch {
      // Invalid or expired tokens still need their cookies cleared below.
    }
  }

  if (refreshToken) {
    try {
      const payload = verifyToken(refreshToken)
      revokeToken(payload.jti, payload.exp! * 1000)
    } catch {
      // Invalid or expired tokens still need their cookies cleared below.
    }
  }

  const response = NextResponse.json({ success: true })
  response.headers.set('Cache-Control', 'no-store, max-age=0')
  response.cookies.set(TOKEN_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    expires: expiredCookieDate,
    path: '/',
  })
  response.cookies.set('refresh_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    expires: expiredCookieDate,
    path: '/',
  })
  return response
}
