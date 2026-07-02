import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, TOKEN_NAME } from './jwt'
import { isTokenRevoked } from './session-store'

interface Payload {
  accountId: string
  role: string
  status: string
}

function getPayloadFromCookie(request: NextRequest): Payload | null {
  const token = request.cookies.get(TOKEN_NAME)?.value
  if (!token) return null

  try {
    const payload = verifyToken(token)
    if (isTokenRevoked(payload.jti)) return null
    if (payload.status === 'suspended') return null
    return { accountId: payload.accountId, role: payload.role || 'user', status: payload.status || 'active' }
  } catch {
    return null
  }
}

export function getAuthFromCookie(request: NextRequest): string | null {
  return getPayloadFromCookie(request)?.accountId ?? null
}

export function getRoleFromCookie(request: NextRequest): string | null {
  return getPayloadFromCookie(request)?.role ?? null
}

export function requireAuth(request: NextRequest): string | NextResponse {
  const accountId = getAuthFromCookie(request)
  if (!accountId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  return accountId
}

export function requireRole(
  request: NextRequest,
  allowedRoles: string[]
): string | NextResponse {
  const payload = getPayloadFromCookie(request)
  if (!payload) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  if (!allowedRoles.includes(payload.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return payload.accountId
}

export function isRedirectResponse(result: string | NextResponse): result is NextResponse {
  return result instanceof NextResponse
}
