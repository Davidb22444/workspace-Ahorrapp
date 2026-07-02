import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromCookie } from '@/lib/auth-utils'
import { generateCsrfToken } from '@/lib/security'

export async function GET(request: NextRequest) {
  const accountId = getAuthFromCookie(request)
  if (!accountId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const token = generateCsrfToken(accountId)
  return NextResponse.json({ csrfToken: token })
}
