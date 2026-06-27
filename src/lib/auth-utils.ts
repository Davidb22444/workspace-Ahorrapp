import { NextRequest, NextResponse } from 'next/server'

export function getAuthFromCookie(request: NextRequest): string | null {
  return request.cookies.get('accountId')?.value ?? null
}

export function requireAuth(request: NextRequest): string | NextResponse {
  const accountId = getAuthFromCookie(request)
  if (!accountId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  return accountId
}

export function isRedirectResponse(result: string | NextResponse): result is NextResponse {
  return result instanceof NextResponse
}
