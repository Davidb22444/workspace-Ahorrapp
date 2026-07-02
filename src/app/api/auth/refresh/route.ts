import { NextRequest, NextResponse } from 'next/server'
import { refreshSessionToken, TOKEN_NAME, createAccessToken, createRefreshToken } from '@/lib/jwt'
import { getClientIp, checkRateLimit } from '@/lib/security'

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const limit = checkRateLimit(`refresh:${ip}`, 10, 15 * 60 * 1000)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' },
        { status: 429 }
      )
    }

    const refreshToken = request.cookies.get('refresh_token')?.value
    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token requerido' }, { status: 401 })
    }

    const result = refreshSessionToken(refreshToken)
    if (!result) {
      const response = NextResponse.json({ error: 'Refresh token inválido o expirado' }, { status: 401 })
      response.cookies.set('refresh_token', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 0, path: '/' })
      return response
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set(TOKEN_NAME, result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60,
      path: '/',
    })
    response.cookies.set('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Refresh error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
