import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { compare } from 'bcryptjs'
import { createAccessToken, createRefreshToken, TOKEN_NAME } from '@/lib/jwt'
import { checkRateLimit, getClientIp } from '@/lib/security'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const limit = checkRateLimit(`login:${ip}`, 5, 15 * 60 * 1000)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(limit.resetIn / 1000)),
            'X-RateLimit-Remaining': '0',
          },
        }
      )
    }

    const body = await request.json()
    const parsed = loginSchema.parse(body)

    const user = await prisma.accounts.findUnique({ where: { email: parsed.email } })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    if (user.status === 'suspended') {
      return NextResponse.json(
        { error: 'Account suspended' },
        { status: 403 }
      )
    }

    if (user.status === 'pending_verification') {
      return NextResponse.json(
        { error: 'Por favor verifica tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.' },
        { status: 403 }
      )
    }

    if (!user.password) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    const valid = await compare(parsed.password, user.password)
    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    const { password: _pw, created_at, updated_at, two_factor_secret, two_factor_recovery_codes, ...rest } = user
    const safeUser = {
      ...rest,
      createdAt: created_at,
      updatedAt: updated_at,
    }

    const accessToken = createAccessToken(user.id, user.role, user.status)
    const refreshToken = createRefreshToken(user.id, user.role, user.status)

    const response = NextResponse.json({ user: safeUser })
    response.cookies.set(TOKEN_NAME, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60,
      path: '/',
    })
    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
