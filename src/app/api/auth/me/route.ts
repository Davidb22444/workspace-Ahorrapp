import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthFromCookie } from '@/lib/auth-utils'
import { refreshSessionToken, TOKEN_NAME, verifyToken } from '@/lib/jwt'

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init)
  response.headers.set('Cache-Control', 'no-store, max-age=0')
  return response
}

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(TOKEN_NAME)?.value
    const refreshCookie = request.cookies.get('refresh_token')?.value
    if (!sessionCookie && !refreshCookie) {
      return noStoreJson({ user: null })
    }

    const accountId = getAuthFromCookie(request)

    if (!accountId) {
      const refreshTokenValue = request.cookies.get('refresh_token')?.value
      if (refreshTokenValue) {
        const result = refreshSessionToken(refreshTokenValue)
        if (result) {
          const payload = verifyToken(result.accessToken)
          const user = await prisma.accounts.findUnique({
            where: { id: payload.accountId },
            select: { id: true, email: true, name: true, role: true, avatar: true, created_at: true, updated_at: true },
          })
          if (user) {
            const { created_at, updated_at, ...rest } = user
            const safeUser = { ...rest, createdAt: created_at, updatedAt: updated_at }
            const response = noStoreJson({ user: safeUser })
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
          }
        }
      }
      return noStoreJson({ user: null })
    }

    const user = await prisma.accounts.findUnique({
      where: { id: accountId },
      select: { id: true, email: true, name: true, role: true, avatar: true, created_at: true, updated_at: true },
    })

    if (!user) {
      return noStoreJson({ user: null })
    }

    const { created_at, updated_at, ...rest } = user
    const safeUser = {
      ...rest,
      createdAt: created_at,
      updatedAt: updated_at,
    }

    return noStoreJson({ user: safeUser })
  } catch (error) {
    console.error('Auth check error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack')
    console.error('Error message:', error instanceof Error ? error.message : String(error))
    return noStoreJson({ user: null, error: 'Internal server error' }, { status: 500 })
  }
}
